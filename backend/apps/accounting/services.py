from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from apps.customers.models import Customer
from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus

from .models import CustomerLedgerEntry, EntryType


def create_ledger_entry(
    *,
    customer: Customer,
    entry_type: str,
    amount,
    description="",
    source_type="",
    source_id="",
    created_by,
    posted_at=None,
):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValueError("Ledger amount must be greater than zero.")

    if posted_at is None:
        posted_at = timezone.now()

    entry = CustomerLedgerEntry.objects.create(
        customer=customer,
        entry_type=entry_type,
        amount=amount,
        description=description,
        source_type=source_type,
        source_id=str(source_id),
        created_by=created_by,
        posted_at=posted_at,
    )
    return entry


def get_customer_balance(*, customer: Customer) -> Decimal:
    totals = CustomerLedgerEntry.objects.filter(customer=customer).aggregate(
        debit=Sum("amount", filter=Q(entry_type=EntryType.DEBIT)),
        credit=Sum("amount", filter=Q(entry_type=EntryType.CREDIT)),
    )
    if totals["debit"] is not None or totals["credit"] is not None:
        debit = Decimal(str(totals["debit"] or "0.00"))
        credit = Decimal(str(totals["credit"] or "0.00"))
        return debit - credit

    total_orders = (
        DesignOrder.objects.filter(customer=customer)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .aggregate(total=Sum("total_amount"))["total"]
        or Decimal("0.00")
    )
    total_paid = (
        DesignOrderPayment.objects.filter(design_order__customer=customer)
        .exclude(design_order__status=DesignOrderStatus.CANCELLED)
        .aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    )
    return total_orders - total_paid


def get_customer_ledger(*, customer: Customer, limit=None):
    qs = CustomerLedgerEntry.objects.filter(customer=customer).select_related("created_by")
    if qs.exists():
        ordered_qs = qs.order_by("-posted_at", "-created_at")
        if limit is not None:
            return list(ordered_qs[:limit])
        return list(ordered_qs)

    orders = (
        DesignOrder.objects.filter(customer=customer)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .order_by("order_date", "created_at")
    )
    payments = (
        DesignOrderPayment.objects.filter(design_order__customer=customer)
        .exclude(design_order__status=DesignOrderStatus.CANCELLED)
        .select_related("design_order", "recorded_by")
        .order_by("payment_date", "created_at")
    )
    entries = []
    for order in orders:
        entries.append(
            SimpleNamespace(
                id=order.id,
                customer=customer,
                entry_type=EntryType.DEBIT,
                amount=order.total_amount,
                description=f"د فرمایش حساب — {order.order_number}",
                source_type="design_order",
                source_id=str(order.id),
                created_by=order.created_by,
                posted_at=datetime.combine(order.order_date, timezone.now().time()),
            )
        )
    for payment in payments:
        entries.append(
            SimpleNamespace(
                id=payment.id,
                customer=customer,
                entry_type=EntryType.CREDIT,
                amount=payment.amount,
                description=f"د فرمایش تادیه — {payment.design_order.order_number}",
                source_type="design_order_payment",
                source_id=str(payment.id),
                created_by=payment.recorded_by,
                posted_at=datetime.combine(payment.payment_date, timezone.now().time()),
            )
        )

    entries.sort(key=lambda entry: (entry.posted_at, str(entry.id)))
    if limit is not None:
        entries = entries[:limit]
    return entries
