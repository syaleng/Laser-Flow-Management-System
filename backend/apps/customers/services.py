from django.db import transaction
from django.utils import timezone

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
