from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus

from .models import Expense, MoneyLoan, MoneyLoanRepayment, PayableAccount, PayableRepayment

ZERO = Decimal("0.00")


class DashboardFilterSerializer(serializers.Serializer):
    period = serializers.ChoiceField(
        choices=("today", "week", "month", "year", "custom"), default="today"
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        today = timezone.localdate()
        period = attrs["period"]
        if period == "today":
            start = end = today
        elif period == "week":
            start, end = today - timedelta(days=today.weekday()), today
        elif period == "month":
            start, end = today.replace(day=1), today
        elif period == "year":
            start, end = today.replace(month=1, day=1), today
        else:
            start, end = attrs.get("start_date"), attrs.get("end_date")
            if not start or not end:
                raise serializers.ValidationError(
                    {"date_range": "start_date and end_date are required for a custom range."}
                )
        if start > end:
            raise serializers.ValidationError(
                {"date_range": "start_date cannot be after end_date."}
            )
        attrs["start_date"], attrs["end_date"] = start, end
        return attrs


def _sum(queryset, field="amount"):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def _money(value):
    return f"{value:.2f}"


def _bucket_start(value: date, monthly: bool):
    return value.replace(day=1) if monthly else value


def _bucket_label(value: date, monthly: bool):
    return value.strftime("%Y-%m") if monthly else value.isoformat()


def _chart_buckets(start, end):
    monthly = (end - start).days > 62
    current = _bucket_start(start, monthly)
    buckets = []
    while current <= end:
        buckets.append(current)
        if monthly:
            current = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            current += timedelta(days=1)
    return buckets, monthly


def _series(rows, date_field, start, end, *, value_field=None):
    buckets, monthly = _chart_buckets(start, end)
    totals = defaultdict(lambda: ZERO if value_field else 0)
    for row in rows:
        key = _bucket_start(getattr(row, date_field), monthly)
        totals[key] += getattr(row, value_field) if value_field else 1
    return [{"date": _bucket_label(bucket, monthly), "value": totals[bucket]} for bucket in buckets]


def _outstanding_customer_debt(end):
    orders = (
        DesignOrder.objects.filter(order_date__lte=end)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .prefetch_related("payment_history")
    )
    return sum(
        (
            order.total_amount
            - sum(
                (p.amount for p in order.payment_history.all() if p.payment_date <= end),
                ZERO,
            )
            for order in orders
        ),
        ZERO,
    )


def _loan_receivables(end):
    loans = MoneyLoan.objects.filter(loan_date__lte=end).prefetch_related("repayments")
    return sum(
        (
            loan.amount
            - sum((r.amount for r in loan.repayments.all() if r.payment_date <= end), ZERO)
            for loan in loans
        ),
        ZERO,
    )


def _shop_payables(end):
    payables = PayableAccount.objects.filter(payable_date__lte=end).prefetch_related("repayments")
    return sum(
        (
            payable.amount
            - sum((r.amount for r in payable.repayments.all() if r.payment_date <= end), ZERO)
            for payable in payables
        ),
        ZERO,
    )


def _activities(start, end):
    items = []

    def add(kind, title, detail, event_date, created_at, user):
        items.append(
            {
                "type": kind,
                "title": title,
                "detail": detail,
                "date": event_date,
                "created_at": created_at,
                "user": user.full_name or user.email,
            }
        )

    orders = DesignOrder.objects.filter(order_date__range=(start, end)).select_related("created_by")
    for order in orders:
        add(
            "order",
            "New order",
            order.order_number,
            order.order_date,
            order.created_at,
            order.created_by,
        )
    payments = DesignOrderPayment.objects.filter(payment_date__range=(start, end)).select_related(
        "recorded_by", "design_order"
    )
    for payment in payments:
        add(
            "payment",
            "Payment received",
            f"{payment.amount} AFN · {payment.design_order.order_number}",
            payment.payment_date,
            payment.created_at,
            payment.recorded_by,
        )
    expenses = Expense.objects.filter(expense_date__range=(start, end)).select_related("created_by")
    for expense in expenses:
        add(
            "expense",
            "Expense recorded",
            f"{expense.amount} AFN · {expense.get_category_display()}",
            expense.expense_date,
            expense.created_at,
            expense.created_by,
        )
    repayments = MoneyLoanRepayment.objects.filter(payment_date__range=(start, end)).select_related(
        "created_by", "money_loan"
    )
    for repayment in repayments:
        add(
            "loan_repayment",
            "Loan repayment",
            f"{repayment.amount} AFN · {repayment.money_loan.person_name}",
            repayment.payment_date,
            repayment.created_at,
            repayment.created_by,
        )
    repayments = PayableRepayment.objects.filter(payment_date__range=(start, end)).select_related(
        "created_by", "payable_account"
    )
    for repayment in repayments:
        add(
            "payable_repayment",
            "Payable repayment",
            f"{repayment.amount} AFN · {repayment.payable_account.person_name}",
            repayment.payment_date,
            repayment.created_at,
            repayment.created_by,
        )
    return sorted(items, key=lambda item: (item["date"], item["created_at"]), reverse=True)[:12]


def build_dashboard(*, start, end, period):
    orders = DesignOrder.objects.filter(order_date__range=(start, end)).exclude(
        status=DesignOrderStatus.CANCELLED
    )
    payments = DesignOrderPayment.objects.filter(payment_date__range=(start, end)).exclude(
        design_order__status=DesignOrderStatus.CANCELLED
    )
    expenses = Expense.objects.filter(expense_date__range=(start, end))
    income, expense_total = _sum(payments), _sum(expenses)
    customer_debt = _outstanding_customer_debt(end)
    loan_receivables = _loan_receivables(end)
    shop_payables = _shop_payables(end)

    payment_series = _series(payments, "payment_date", start, end, value_field="amount")
    expense_series = _series(expenses, "expense_date", start, end, value_field="amount")
    order_series = _series(orders, "order_date", start, end)
    combined = [
        {
            "date": payment["date"],
            "income": _money(payment["value"]),
            "expenses": _money(expense["value"]),
            "profit": _money(payment["value"] - expense["value"]),
        }
        for payment, expense in zip(payment_series, expense_series, strict=True)
    ]
    categories = expenses.values("category").annotate(total=Sum("amount")).order_by("category")
    category_labels = dict(Expense._meta.get_field("category").choices)
    return {
        "period": period,
        "start_date": start,
        "end_date": end,
        "cards": {
            "orders": orders.count(),
            "received_payments": _money(income),
            "expenses": _money(expense_total),
            "profit_loss": _money(income - expense_total),
            "customer_receivables": _money(customer_debt),
            "shop_payables": _money(shop_payables),
            "net_financial_position": _money(customer_debt + loan_receivables - shop_payables),
        },
        "debt": {
            "customer_receivables": _money(customer_debt),
            "loan_receivables": _money(loan_receivables),
            "shop_payables": _money(shop_payables),
        },
        "charts": {
            "income_expense_profit": combined,
            "expense_categories": [
                {
                    "category": row["category"],
                    "label": category_labels[row["category"]],
                    "value": _money(row["total"]),
                }
                for row in categories
            ],
            "payment_trend": [
                {"date": row["date"], "value": _money(row["value"])} for row in payment_series
            ],
            "order_trend": order_series,
        },
        "recent_activity": _activities(start, end),
    }
