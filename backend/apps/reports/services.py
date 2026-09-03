from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum

from apps.customers.models import Customer
from apps.daily_journal.models import (
    Expense,
    MoneyLoan,
    MoneyLoanRepayment,
    PayableAccount,
    PayableRepayment,
)
from apps.daily_journal.services import calculate_cash_finances
from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus
from apps.suppliers.models import Supplier, SupplierTransaction

ZERO = Decimal("0.00")

EXPENSE_CLASSIFICATION = {
    "DIAMONDS": ("machine", "د ماشین اړوند مصارف", "ډایان"),
    "MATERIALS": ("machine", "د ماشین اړوند مصارف", "بورډ / تخته"),
    "MAINTENANCE": ("machine", "د ماشین اړوند مصارف", "نور ماشین اړوند مصارف"),
    "FOOD_STAFF": ("daily", "خوراکي او ورځني مصارف", "خوراکي او ورځني مصارف"),
}
GROUP_LABELS = {
    "machine": "د ماشین اړوند مصارف",
    "daily": "خوراکي او ورځني مصارف",
    "other": "نور مصارف",
}


def money(value):
    return f"{value:.2f}"


def total(queryset, field="amount"):
    return queryset.aggregate(value=Sum(field))["value"] or ZERO


def expense_breakdown(expenses, expense_total):
    category_labels = dict(Expense._meta.get_field("category").choices)
    category_totals = expenses.values("category").annotate(amount=Sum("amount")).order_by(
        "category"
    )
    rows = []
    group_totals = defaultdict(lambda: ZERO)
    for item in category_totals:
        category = item["category"]
        amount = item["amount"] or ZERO
        group, group_label, subcategory = EXPENSE_CLASSIFICATION.get(
            category,
            ("other", GROUP_LABELS["other"], category_labels.get(category, category)),
        )
        group_totals[group] += amount
        percentage = (
            (amount / expense_total * Decimal("100")).quantize(Decimal("0.1"))
            if expense_total
            else ZERO
        )
        rows.append(
            {
                "group": group,
                "group_label": group_label,
                "subcategory": subcategory,
                "amount": money(amount),
                "percentage": f"{percentage:.1f}",
            }
        )
    return {
        "total": money(expense_total),
        "groups": [
            {"key": key, "label": label, "total": money(group_totals[key])}
            for key, label in GROUP_LABELS.items()
        ],
        "rows": rows,
    }


def filter_orders(queryset, filters):
    if customer_id := filters.get("customer_id"):
        queryset = queryset.filter(customer_id=customer_id)
    if status := filters.get("status"):
        queryset = queryset.filter(status=status)
    if payment_status := filters.get("payment_status"):
        queryset = queryset.filter(payment_status=payment_status)
    return queryset


def outstanding_order_amount(order, end):
    paid = sum(
        (payment.amount for payment in order.payment_history.all() if payment.payment_date <= end),
        ZERO,
    )
    return max(order.total_amount - paid, ZERO)


def remaining_loan_amount(loan, end):
    returned = sum(
        (repayment.amount for repayment in loan.repayments.all() if repayment.payment_date <= end),
        ZERO,
    )
    return max(loan.amount - returned, ZERO)


def remaining_payable_amount(payable, end):
    paid = sum(
        (
            repayment.amount
            for repayment in payable.repayments.all()
            if repayment.payment_date <= end
        ),
        ZERO,
    )
    return max(payable.amount - paid, ZERO)


def trend(payments, expenses, orders, start, end):
    monthly = (end - start).days > 62

    def key(value):
        return value.replace(day=1) if monthly else value

    income, costs, order_counts = (
        defaultdict(lambda: ZERO),
        defaultdict(lambda: ZERO),
        defaultdict(int),
    )
    for order in orders:
        income[key(order.order_date)] += order.total_amount
    for expense in expenses:
        costs[key(expense.expense_date)] += expense.amount
    for order in orders:
        order_counts[key(order.order_date)] += 1
    cursor = key(start)
    rows = []
    while cursor <= end:
        rows.append(
            {
                "date": cursor.strftime("%Y-%m") if monthly else cursor.isoformat(),
                "sales": money(income[cursor]),
                "expenses": money(costs[cursor]),
                "profit": money(income[cursor] - costs[cursor]),
                "orders": order_counts[cursor],
            }
        )
        cursor = (
            (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
            if monthly
            else cursor + timedelta(days=1)
        )
    return rows


def build_report(filters):
    start, end = filters["start_date"], filters["end_date"]
    period_orders = filter_orders(
        DesignOrder.objects.filter(order_date__range=(start, end)).exclude(
            status=DesignOrderStatus.CANCELLED
        ),
        filters,
    ).select_related("customer")
    snapshot_orders = (
        filter_orders(
            DesignOrder.objects.filter(order_date__lte=end).exclude(
                status=DesignOrderStatus.CANCELLED
            ),
            filters,
        )
        .select_related("customer")
        .prefetch_related("payment_history")
    )
    payments = DesignOrderPayment.objects.filter(payment_date__range=(start, end)).exclude(
        design_order__status=DesignOrderStatus.CANCELLED
    )
    if customer_id := filters.get("customer_id"):
        payments = payments.filter(design_order__customer_id=customer_id)
    if status := filters.get("status"):
        payments = payments.filter(design_order__status=status)
    if payment_status := filters.get("payment_status"):
        payments = payments.filter(design_order__payment_status=payment_status)
    payments = payments.select_related("design_order", "design_order__customer", "recorded_by")
    customer_report = bool(filters.get("customer_id"))
    expenses = (
        Expense.objects.none()
        if customer_report
        else Expense.objects.filter(expense_date__range=(start, end))
    )
    loan_repayments = (
        MoneyLoanRepayment.objects.none()
        if customer_report
        else MoneyLoanRepayment.objects.filter(payment_date__range=(start, end)).select_related(
            "money_loan", "created_by"
        )
    )
    payable_repayments = (
        PayableRepayment.objects.none()
        if customer_report
        else PayableRepayment.objects.filter(payment_date__range=(start, end))
    )
    supplier_payments = (
        SupplierTransaction.objects.none()
        if customer_report
        else SupplierTransaction.objects.filter(
            transaction_date__range=(start, end),
            transaction_type=SupplierTransaction.TransactionType.CREDIT,
        )
    )
    received, expense_total = total(payments), total(expenses)
    customer_balances = defaultdict(
        lambda: {"orders": 0, "value": ZERO, "paid": ZERO, "remaining": ZERO, "customer": None}
    )
    for order in snapshot_orders:
        row = customer_balances[order.customer_id]
        row["customer"] = order.customer
        if start <= order.order_date <= end:
            row["orders"] += 1
            row["value"] += order.total_amount
        period_paid = sum(
            (
                payment.amount
                for payment in order.payment_history.all()
                if start <= payment.payment_date <= end
            ),
            ZERO,
        )
        row["paid"] += period_paid
        row["remaining"] += outstanding_order_amount(order, end)

    payments_by_customer = defaultdict(list)
    for payment in payments:
        payments_by_customer[payment.design_order.customer_id].append(
            {
                "date": payment.payment_date,
                "amount": money(payment.amount),
                "order_number": payment.design_order.order_number,
                "recorded_by": payment.recorded_by.full_name,
                "note": payment.note,
            }
        )
    customer_rows = [
        {
            "customer_id": str(customer_id),
            "customer_code": row["customer"].customer_code,
            "customer_name": row["customer"].full_name,
            "total_orders": row["orders"],
            "total_order_value": money(row["value"]),
            "total_paid": money(row["paid"]),
            "remaining_balance": money(row["remaining"]),
            "payment_history": payments_by_customer[customer_id],
        }
        for customer_id, row in customer_balances.items()
        if row["orders"] or row["paid"] or row["remaining"]
    ]
    customer_rows.sort(key=lambda row: row["customer_name"])

    payables = (
        PayableAccount.objects.none()
        if customer_report
        else PayableAccount.objects.filter(payable_date__lte=end).prefetch_related("repayments")
    )
    payable_rows = [
        {
            "id": str(item.id),
            "person_name": item.person_name,
            "debt_type": item.debt_type,
            "original_amount": money(item.amount),
            "remaining_balance": money(remaining_payable_amount(item, end)),
            "payable_date": item.payable_date,
            "purpose": item.purpose,
        }
        for item in payables
        if remaining_payable_amount(item, end) > ZERO
    ]
    suppliers = (
        Supplier.objects.none()
        if customer_report
        else Supplier.objects.prefetch_related("transactions")
    )
    for supplier in suppliers:
        entries = [entry for entry in supplier.transactions.all() if entry.transaction_date <= end]
        debit = sum((entry.amount for entry in entries if entry.transaction_type == "DEBIT"), ZERO)
        credit = sum(
            (entry.amount for entry in entries if entry.transaction_type == "CREDIT"), ZERO
        )
        remaining = debit - credit
        if remaining > ZERO:
            payable_rows.append(
                {
                    "id": str(supplier.id),
                    "person_name": supplier.name,
                    "debt_type": "SUPPLIER",
                    "original_amount": money(debit),
                    "remaining_balance": money(remaining),
                    "payable_date": max(entry.transaction_date for entry in entries),
                    "purpose": supplier.description or "Supplier materials or services",
                }
            )
    loans = (
        MoneyLoan.objects.none()
        if customer_report
        else MoneyLoan.objects.filter(loan_date__lte=end).prefetch_related("repayments")
    )
    loan_balance = sum((remaining_loan_amount(item, end) for item in loans), ZERO)
    customer_debt = sum((row["remaining"] for row in customer_balances.values()), ZERO)
    shop_payables = sum((Decimal(row["remaining_balance"]) for row in payable_rows), ZERO)
    sales = total(period_orders, "total_amount")
    payable_return_total = total(payable_repayments)
    supplier_payment_total = total(supplier_payments)
    cash_finances = calculate_cash_finances(start, end)
    expenses_report = expense_breakdown(expenses, expense_total)
    return {
        "filter_options": {
            "customers": [
                {
                    "id": str(customer.id),
                    "customer_code": customer.customer_code,
                    "full_name": customer.full_name,
                }
                for customer in Customer.objects.filter(design_orders__isnull=False)
                .distinct()
                .order_by("full_name")
            ],
        },
        "filters": {
            "period": filters["period"],
            "start_date": start,
            "end_date": end,
            "customer_id": filters.get("customer_id"),
            "status": filters.get("status", ""),
            "payment_status": filters.get("payment_status", ""),
        },
        "summary": {
            "total_orders": period_orders.count(),
            "total_sales": money(sales),
            "received_payments": money(received),
            "expenses": money(expense_total),
            "supplier_payments": money(supplier_payment_total + payable_return_total),
            "profit_loss": money(sales - expense_total),
            "customer_receivables": money(customer_debt),
            "shop_payables": money(shop_payables),
            "loan_balances": money(loan_balance),
            "cash_movement": money(
                received
                if customer_report
                else cash_finances["closing_balance"] - cash_finances["opening_balance"]
            ),
            "cash_balance": money(cash_finances["closing_balance"]),
        },
        "customers": customer_rows,
        "expenses": expenses_report,
        "debts": {
            "customer_receivables": [
                {
                    "customer_id": row["customer_id"],
                    "customer_name": row["customer_name"],
                    "remaining_balance": row["remaining_balance"],
                }
                for row in customer_rows
                if Decimal(row["remaining_balance"]) > ZERO
            ],
            "shop_payables": payable_rows,
            "loan_repayments": [
                {
                    "id": str(item.id),
                    "person_name": item.money_loan.person_name,
                    "amount": money(item.amount),
                    "payment_date": item.payment_date,
                    "payment_method": item.payment_method,
                    "recorded_by": item.created_by.full_name,
                }
                for item in loan_repayments
            ],
        },
        "charts": {"financial_trend": trend(payments, expenses, period_orders, start, end)},
    }
