from datetime import datetime, time, timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from apps.accounting.models import CustomerLedgerEntry, EntryType
from apps.accounting.services import create_ledger_entry
from apps.daily_journal.models import JournalActivity

from .models import (
    DesignCategory,
    DesignOrder,
    DesignOrderPayment,
    DesignOrderStatus,
    DesignOrderStatusHistory,
    PaymentStatus,
)

ALLOWED_TRANSITIONS = {
    DesignOrderStatus.NEW: {
        DesignOrderStatus.DESIGN_PREPARATION,
        DesignOrderStatus.CANCELLED,
    },
    DesignOrderStatus.DESIGN_PREPARATION: {
        DesignOrderStatus.CUTTING,
        DesignOrderStatus.CANCELLED,
    },
    DesignOrderStatus.CUTTING: {
        DesignOrderStatus.READY_FOR_DELIVERY,
        DesignOrderStatus.CANCELLED,
    },
    DesignOrderStatus.READY_FOR_DELIVERY: {
        DesignOrderStatus.DELIVERED,
        DesignOrderStatus.CANCELLED,
    },
    DesignOrderStatus.DELIVERED: {DesignOrderStatus.CANCELLED},
    DesignOrderStatus.CANCELLED: set(),
}

LOCKED_AFTER_PROCESSING = {"customer", "order_date"}
LOCKED_AFTER_TERMINAL = {
    "customer",
    "design_category",
    "cut_quantity",
    "unit_price",
    "material_quantity",
    "order_date",
    "expected_delivery_date",
    "payment_due_date",
}
FILE_FIELDS = {
    "customer_reference_image",
    "design_preview_image",
    "design_file_reference",
}


def _validate_relations(data: dict) -> None:
    customer = data.get("customer")
    if customer is not None and not customer.is_active:
        raise ValidationError({"customer_id": "New orders require an active customer."})
    category = data.get("design_category")
    if category is not None and not category.is_active:
        raise ValidationError({"design_category_id": "Select an active design category."})


def _prepare_design_file_metadata(data: dict) -> None:
    if design_file := data.get("design_file_reference"):
        data["design_file_name"] = Path(design_file.name).name
        data["design_file_type"] = Path(design_file.name).suffix.lower().lstrip(".")


def _schedule_replaced_file_cleanup(order: DesignOrder, old_names: dict[str, str]) -> None:
    for field_name, old_name in old_names.items():
        current = getattr(order, field_name)
        if old_name and old_name != current.name:
            storage = current.storage
            transaction.on_commit(lambda name=old_name, backend=storage: backend.delete(name))


@transaction.atomic
def create_design_order(*, data: dict, created_by) -> DesignOrder:
    _validate_relations(data)
    _prepare_design_file_metadata(data)
    data["payment_due_date"] = data.get("order_date", timezone.localdate()) + timedelta(
        days=settings.DEFAULT_PAYMENT_TERMS_DAYS
    )
    if data.get("status") == DesignOrderStatus.DELIVERED:
        data["actual_delivery_date"] = timezone.localdate()
    order = DesignOrder(created_by=created_by, **data)
    order.full_clean()
    order.save()
    initial_payment = None
    if order.paid_amount > 0:
        initial_payment = DesignOrderPayment.objects.create(
            design_order=order,
            amount=order.paid_amount,
            recorded_by=created_by,
            payment_date=order.order_date,
            note="لومړنۍ تادیه",
        )
    create_ledger_entry(
        customer=order.customer,
        entry_type=EntryType.DEBIT,
        amount=order.total_amount,
        description=f"د فرمایش حساب — {order.order_number}",
        source_type="design_order",
        source_id=str(order.id),
        created_by=created_by,
        posted_at=timezone.make_aware(datetime.combine(order.order_date, time.min)),
    )
    if initial_payment is not None:
        create_ledger_entry(
            customer=order.customer,
            entry_type=EntryType.CREDIT,
            amount=initial_payment.amount,
            description=f"د فرمایش تادیه — {order.order_number}",
            source_type="design_order_payment",
            source_id=str(initial_payment.id),
            created_by=created_by,
            posted_at=timezone.make_aware(datetime.combine(initial_payment.payment_date, time.max)),
        )
    DesignOrderStatusHistory.objects.create(
        design_order=order,
        from_status=None,
        to_status=order.status,
        changed_by=created_by,
        note="فرمایش جوړ شو",
    )
    return order


@transaction.atomic
def update_design_order(*, order: DesignOrder, data: dict) -> DesignOrder:
    _validate_relations(data)
    if "order_date" in data:
        data["payment_due_date"] = data["order_date"] + timedelta(
            days=settings.DEFAULT_PAYMENT_TERMS_DAYS
        )
    if "status" in data:
        data["actual_delivery_date"] = (
            timezone.localdate() if data["status"] == DesignOrderStatus.DELIVERED else None
        )
    changed_fields = {
        field_name for field_name, value in data.items() if getattr(order, field_name) != value
    }
    if order.status != DesignOrderStatus.NEW and changed_fields & LOCKED_AFTER_PROCESSING:
        raise ValidationError(
            {"order": "د ډیزاین د کار له پیل وروسته مشتري او د فرمایش نېټه نه شي بدلېدای."}
        )
    if order.status in {DesignOrderStatus.DELIVERED, DesignOrderStatus.CANCELLED} and (
        changed_fields & LOCKED_AFTER_TERMINAL
    ):
        raise ValidationError(
            {"order": "د بشپړو شویو فرمایشونو مالي معلومات او نېټې نه شي بدلېدای."}
        )

    old_names = {
        field: getattr(order, field).name for field in FILE_FIELDS if field in changed_fields
    }
    _prepare_design_file_metadata(data)
    for field, value in data.items():
        setattr(order, field, value)
    order.full_clean()
    order.save(update_fields=[*data.keys(), "updated_at"])
    _schedule_replaced_file_cleanup(order, old_names)
    return order


@transaction.atomic
def transition_design_order(*, order: DesignOrder, target_status: str, changed_by, note=""):
    order = DesignOrder.objects.select_for_update().get(pk=order.pk)
    if target_status not in ALLOWED_TRANSITIONS[order.status]:
        raise ValidationError({"status": f"{order.status} cannot transition to {target_status}."})

    previous = order.status
    order.status = target_status
    update_fields = ["status", "updated_at"]
    if target_status == DesignOrderStatus.DELIVERED:
        order.actual_delivery_date = timezone.localdate()
        update_fields.append("actual_delivery_date")
        expected_due_date = order.order_date + timedelta(days=settings.DEFAULT_PAYMENT_TERMS_DAYS)
        if order.payment_due_date != expected_due_date:
            order.payment_due_date = expected_due_date
            update_fields.append("payment_due_date")
    elif target_status == DesignOrderStatus.CANCELLED:
        order.actual_delivery_date = None
        update_fields.append("actual_delivery_date")
    order.full_clean()
    order.save(update_fields=update_fields)
    if target_status == DesignOrderStatus.CANCELLED:
        payment_ids = list(order.payment_history.values_list("id", flat=True))
        CustomerLedgerEntry.objects.filter(
            customer=order.customer,
        ).filter(
            models.Q(source_type="design_order", source_id=str(order.id))
            | models.Q(
                source_type="design_order_payment",
                source_id__in=[str(item) for item in payment_ids],
            )
        ).delete()
    DesignOrderStatusHistory.objects.create(
        design_order=order,
        from_status=previous,
        to_status=target_status,
        changed_by=changed_by,
        note=note,
    )
    return order


@transaction.atomic
def record_design_order_payment(
    *, order: DesignOrder, amount, recorded_by, note="", payment_date=None, ledger_description=None
):
    order = DesignOrder.objects.select_for_update().get(pk=order.pk)
    if order.status == DesignOrderStatus.CANCELLED:
        raise ValidationError({"amount": "لغوه شوي فرمایش ته تادیه نه شي ثبتېدای."})
    remaining = order.total_amount - order.paid_amount
    if amount <= 0:
        raise ValidationError({"amount": "د تادیې اندازه باید له صفر څخه زیاته وي."})
    if amount > remaining:
        raise ValidationError({"amount": "نوې تادیه له پاتې پیسو څخه زیاته ده."})

    payment = DesignOrderPayment.objects.create(
        design_order=order,
        amount=amount,
        recorded_by=recorded_by,
        payment_date=payment_date or timezone.localdate(),
        note=note,
    )
    order.paid_amount += amount
    order.payment_status = (
        PaymentStatus.FULLY_PAID
        if order.paid_amount == order.total_amount
        else PaymentStatus.PARTIAL
    )
    order.full_clean()
    order.save(update_fields=["paid_amount", "payment_status", "updated_at"])
    create_ledger_entry(
        customer=order.customer,
        entry_type=EntryType.CREDIT,
        amount=amount,
        description=ledger_description or f"د فرمایش تادیه — {order.order_number}",
        source_type="design_order_payment",
        source_id=str(payment.id),
        created_by=recorded_by,
        posted_at=timezone.make_aware(datetime.combine(payment.payment_date, time.max)),
    )
    JournalActivity.objects.create(
        entity_type="payment",
        entity_id=payment.id,
        action="payment_received",
        changed_fields={
            "customer_name": order.customer.full_name,
            "order_number": order.order_number,
            "amount": str(amount),
            "payment_date": str(payment.payment_date),
            "recorded_by": recorded_by.full_name,
        },
        actor=recorded_by,
    )
    return order, payment


@transaction.atomic
def void_design_order_payment(*, payment: DesignOrderPayment, voided_by, reason: str) -> DesignOrder:
    payment = DesignOrderPayment.objects.select_for_update().select_related(
        "design_order", "design_order__customer"
    ).get(pk=payment.pk)
    order = DesignOrder.objects.select_for_update().get(pk=payment.design_order_id)
    original_amount = payment.amount

    CustomerLedgerEntry.objects.filter(
        source_type="design_order_payment", source_id=str(payment.id)
    ).delete()
    order.paid_amount = max(order.paid_amount - original_amount, Decimal("0.00"))
    order.payment_status = PaymentStatus.CREDIT if order.paid_amount == 0 else PaymentStatus.PARTIAL
    order.full_clean()
    order.save(update_fields=["paid_amount", "payment_status", "updated_at"])
    JournalActivity.objects.create(
        entity_type="payment",
        entity_id=payment.id,
        action="payment_voided",
        changed_fields={
            "customer_name": order.customer.full_name,
            "order_number": order.order_number,
            "amount": str(original_amount),
            "reason": reason,
            "voided_by": voided_by.full_name,
        },
        actor=voided_by,
    )
    payment.delete()
    return order


@transaction.atomic
def create_category(*, data: dict) -> DesignCategory:
    category = DesignCategory(**data)
    category.full_clean()
    category.save()
    return category


@transaction.atomic
def update_category(*, category: DesignCategory, data: dict) -> DesignCategory:
    for field, value in data.items():
        setattr(category, field, value)
    category.full_clean()
    category.save(update_fields=[*data.keys(), "updated_at"])
    return category
