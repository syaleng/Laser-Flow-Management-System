from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.accounting.models import CustomerLedgerEntry
from apps.design_orders.models import DesignOrder, DesignOrderStatus
from apps.design_orders.services import record_design_order_payment

from .models import Customer
from .validators import normalize_whatsapp_number


def _prepare_data(customer: Customer, data: dict) -> dict:
    prepared = dict(data)
    if "whatsapp_number" in prepared:
        prepared["whatsapp_number"] = normalize_whatsapp_number(prepared["whatsapp_number"])

    consent = prepared.get("whatsapp_consent", customer.whatsapp_consent)
    number = prepared.get("whatsapp_number", customer.whatsapp_number)
    if consent and not number:
        prepared["whatsapp_number"] = number

    if "whatsapp_consent" in prepared:
        if prepared["whatsapp_consent"] and not customer.whatsapp_consent:
            prepared["whatsapp_consent_at"] = timezone.now()
        elif not prepared["whatsapp_consent"]:
            prepared["whatsapp_consent_at"] = None
    return prepared


@transaction.atomic
def create_customer(*, data: dict) -> Customer:
    customer = Customer()
    prepared = _prepare_data(customer, data)
    for field, value in prepared.items():
        setattr(customer, field, value)
    customer.full_clean()
    customer.save()
    return customer


@transaction.atomic
def update_customer(*, customer: Customer, data: dict) -> Customer:
    prepared = _prepare_data(customer, data)
    for field, value in prepared.items():
        setattr(customer, field, value)
    customer.full_clean()
    customer.save(update_fields=[*prepared.keys(), "updated_at"])
    return customer


def archive_customer(*, customer: Customer) -> Customer:
    if customer.is_active:
        return update_customer(customer=customer, data={"is_active": False})
    return customer


def restore_customer(*, customer: Customer) -> Customer:
    if not customer.is_active:
        return update_customer(customer=customer, data={"is_active": True})
    return customer


@transaction.atomic
def record_customer_payment(
    *, customer: Customer, amount, recorded_by, description="", payment_date=None
):
    """Apply one customer receipt to active orders, oldest debt first."""
    customer = Customer.objects.select_for_update().get(pk=customer.pk)
    amount = Decimal(str(amount))
    orders = list(
        DesignOrder.objects.select_for_update()
        .filter(customer=customer)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .order_by("order_date", "created_at")
    )
    remaining_debt = sum(
        (max(order.total_amount - order.paid_amount, Decimal("0.00")) for order in orders),
        Decimal("0.00"),
    )
    if remaining_debt <= 0:
        raise ValidationError({"amount": "د دې مشتري پاتې حساب صفر دی؛ نوې تادیه نه شي ثبتېدای."})
    if amount > remaining_debt:
        raise ValidationError(
            {
                "amount": (
                    "تادیه د پاتې حساب څخه زیاته نه شي کېدای. "
                    f"پاتې حساب {remaining_debt:.2f} افغانۍ دی."
                )
            }
        )

    unapplied = amount
    created_payments = []
    for order in orders:
        order_remaining = max(order.total_amount - order.paid_amount, Decimal("0.00"))
        if order_remaining == 0:
            continue
        applied = min(unapplied, order_remaining)
        _, payment = record_design_order_payment(
            order=order,
            amount=applied,
            recorded_by=recorded_by,
            note=description,
            payment_date=payment_date,
            ledger_description=description or f"د فرمایش تادیه — {order.order_number}",
        )
        created_payments.append(payment)
        unapplied -= applied
        if unapplied == 0:
            break

    entry = CustomerLedgerEntry.objects.get(
        source_type="design_order_payment", source_id=str(created_payments[0].id)
    )
    return entry
