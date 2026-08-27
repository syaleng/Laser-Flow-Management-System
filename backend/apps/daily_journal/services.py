from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum

from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus
from apps.suppliers.models import SupplierTransaction

from .models import (
    Expense,
    JournalActivity,
    LoanStatus,
    MoneyLoan,
    MoneyLoanRepayment,
    PayableAccount,
    PayableRepayment,
)

ZERO = Decimal("0.00")


def _total(queryset, field="amount"):
    return queryset.aggregate(total=Sum(field))["total"] or ZERO


def _dated(queryset, field, start, end):
    if start is None:
        return queryset.filter(**{f"{field}__lte": end})
    return queryset.filter(**{f"{field}__range": (start, end)})


def _cash_components(start, end):
    payments = _dated(DesignOrderPayment.objects.all(), "payment_date", start, end).exclude(
        design_order__status=DesignOrderStatus.CANCELLED
    )
    expenses = _dated(Expense.objects.all(), "expense_date", start, end)
    loans = _dated(MoneyLoan.objects.all(), "loan_date", start, end)
    loan_returns = _dated(MoneyLoanRepayment.objects.all(), "payment_date", start, end)
    payable_payments = _dated(PayableRepayment.objects.all(), "payment_date", start, end)
    supplier_payments = _dated(
        SupplierTransaction.objects.filter(
            transaction_type=SupplierTransaction.TransactionType.CREDIT
        ),
        "transaction_date",
        start,
        end,
    )
    return {
        "customer_payments": _total(payments),
        "expenses": _total(expenses),
        "loan_given": _total(loans),
        "loan_returns": _total(loan_returns),
        "other_income": ZERO,
        "payable_payments": _total(payable_payments) + _total(supplier_payments),
    }


def calculate_cash_finances(start, end):
    before = _cash_components(None, start - timedelta(days=1))
    current = _cash_components(start, end)
    opening = (
        before["customer_payments"]
        + before["other_income"]
        + before["loan_returns"]
        - before["expenses"]
        - before["loan_given"]
        - before["payable_payments"]
    )
    closing = (
        opening
        + current["customer_payments"]
        + current["other_income"]
        + current["loan_returns"]
        - current["expenses"]
        - current["loan_given"]
        - current["payable_payments"]
    )
    sales = _total(
        DesignOrder.objects.filter(order_date__range=(start, end)).exclude(
            status=DesignOrderStatus.CANCELLED
        ),
        field="total_amount",
    )
    return {
        **current,
        "opening_balance": opening,
        "closing_balance": closing,
        "total_income": current["customer_payments"] + current["other_income"],
        "total_expenses": current["expenses"],
        "sales": sales,
        "net_profit": sales - current["expenses"],
    }


def calculate_daily_finances(selected_date):
    return calculate_cash_finances(selected_date, selected_date)


def build_transactions(start, end):
    transactions = []

    def add(kind, direction, amount, event_date, created_at, user, related="—", order="—"):
        transactions.append(
            {
                "transaction_type": kind,
                "direction": direction,
                "amount": amount,
                "date": event_date,
                "time": created_at,
                "user": user.full_name or user.email,
                "related": related,
                "order_number": order,
            }
        )

    for item in (
        DesignOrderPayment.objects.filter(payment_date__range=(start, end))
        .exclude(design_order__status=DesignOrderStatus.CANCELLED)
        .select_related("recorded_by", "design_order__customer")
    ):
        add(
            "customer_payment",
            "in",
            item.amount,
            item.payment_date,
            item.created_at,
            item.recorded_by,
            item.design_order.customer.full_name,
            item.design_order.order_number,
        )
    expenses = Expense.objects.filter(expense_date__range=(start, end)).select_related("created_by")
    for item in expenses:
        add(
            "expense",
            "out",
            item.amount,
            item.expense_date,
            item.created_at,
            item.created_by,
            item.get_category_display(),
        )
    loans = MoneyLoan.objects.filter(loan_date__range=(start, end)).select_related("created_by")
    for item in loans:
        add(
            "loan_given",
            "out",
            item.amount,
            item.loan_date,
            item.created_at,
            item.created_by,
            item.person_name,
        )
    for item in MoneyLoanRepayment.objects.filter(payment_date__range=(start, end)).select_related(
        "created_by", "money_loan"
    ):
        add(
            "loan_repayment",
            "in",
            item.amount,
            item.payment_date,
            item.created_at,
            item.created_by,
            item.money_loan.person_name,
        )
    payables = PayableAccount.objects.filter(payable_date__range=(start, end)).select_related(
        "created_by"
    )
    for item in payables:
        add(
            "payable_created",
            "non_cash",
            item.amount,
            item.payable_date,
            item.created_at,
            item.created_by,
            item.person_name,
        )
    for item in PayableRepayment.objects.filter(payment_date__range=(start, end)).select_related(
        "created_by", "payable_account"
    ):
        add(
            "payable_payment",
            "out",
            item.amount,
            item.payment_date,
            item.created_at,
            item.created_by,
            item.payable_account.person_name,
        )
    for item in SupplierTransaction.objects.filter(
        transaction_date__range=(start, end),
        transaction_type=SupplierTransaction.TransactionType.CREDIT,
    ).select_related("created_by", "supplier"):
        add(
            "supplier_payment",
            "out",
            item.amount,
            item.transaction_date,
            item.created_at,
            item.created_by,
            item.supplier.name,
        )
    return sorted(transactions, key=lambda item: (item["date"], item["time"]), reverse=True)


@transaction.atomic
def record_loan_repayment(*, loan: MoneyLoan, data: dict, created_by):
    loan = MoneyLoan.objects.select_for_update().get(pk=loan.pk)
    remaining = loan.remaining_balance
    if data["amount"] > remaining:
        raise ValidationError({"amount": "Repayment cannot exceed the remaining loan balance."})
    repayment = MoneyLoanRepayment.objects.create(money_loan=loan, created_by=created_by, **data)
    returned = loan.total_returned
    loan.status = LoanStatus.RETURNED if returned >= loan.amount else LoanStatus.PARTIALLY_RETURNED
    loan.save(update_fields=["status", "updated_at"])
    JournalActivity.objects.create(
        entity_type="loan_repayment",
        entity_id=repayment.id,
        action="repayment_made",
        changed_fields={
            "person_name": loan.person_name,
            "amount": str(repayment.amount),
            "payment_date": str(repayment.payment_date),
            "payment_method": repayment.payment_method,
            "recorded_by": created_by.full_name,
        },
        actor=created_by,
    )
    return loan, repayment


@transaction.atomic
def record_payable_repayment(*, payable: PayableAccount, data: dict, created_by):
    payable = PayableAccount.objects.select_for_update().get(pk=payable.pk)
    remaining = payable.remaining_balance
    if data["amount"] > remaining:
        raise ValidationError({"amount": "Repayment cannot exceed the remaining payable balance."})
    repayment = PayableRepayment.objects.create(
        payable_account=payable, created_by=created_by, **data
    )
    JournalActivity.objects.create(
        entity_type="payable_repayment",
        entity_id=repayment.id,
        action="repayment_made",
        changed_fields={
            "person_name": payable.person_name,
            "amount": str(repayment.amount),
            "payment_date": str(repayment.payment_date),
            "payment_method": repayment.payment_method,
            "recorded_by": created_by.full_name,
        },
        actor=created_by,
    )
    return payable, repayment
