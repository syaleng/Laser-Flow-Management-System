from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounting.models import CustomerLedgerEntry, EntryType
from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.design_orders.models import DesignOrderPayment, DesignOrderStatus
from apps.design_orders.services import create_design_order, transition_design_order


def create_order(customer, owner, amount="1000.00", paid="0.00"):
    return create_design_order(
        data={
            "customer": customer,
            "design_name": "Customer payment regression order",
            "cut_quantity": 1,
            "unit_price": Decimal(amount),
            "material_quantity": 1,
            "paid_amount": Decimal(paid),
            "payment_status": "PARTIAL" if Decimal(paid) else "CREDIT",
            "design_type": "SIMPLE",
            "color_count": "1",
            "gemstone_size": 5,
            "baran_size_mm": Decimal("4.00"),
            "order_date": timezone.localdate(),
            "expected_delivery_date": timezone.localdate() + timedelta(days=2),
        },
        created_by=owner,
    )


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="customer-owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Shop Owner",
        role=UserRole.OWNER,
    )


@pytest.fixture
def viewer(db):
    return User.objects.create_user(
        email="customer-viewer@example.com",
        password="Strong-Test-Password-123!",
        full_name="Report Viewer",
        role=UserRole.VIEWER,
    )


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        full_name="Ahmad Customer",
        phone="0700000000",
        whatsapp_number="+93700000000",
    )


@pytest.mark.django_db
def test_owner_can_create_customer_with_whatsapp_consent(client, owner):
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-list"),
        {
            "full_name": "  Maryam Customer  ",
            "phone": "0799999999",
            "whatsapp_number": "0700123456",
            "whatsapp_consent": True,
            "address": "Kabul",
            "notes": "Prefers WhatsApp contact",
        },
    )

    assert response.status_code == 201
    assert response.data["data"]["customer_code"].startswith("CUS-")
    assert response.data["data"]["full_name"] == "Maryam Customer"
    assert response.data["data"]["whatsapp_number"] == "+93700123456"
    assert response.data["data"]["whatsapp_consent_at"] is not None


@pytest.mark.django_db
def test_consent_requires_whatsapp_number(client, owner):
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-list"),
        {"full_name": "No WhatsApp", "whatsapp_consent": True},
    )

    assert response.status_code == 400
    assert "whatsapp_number" in response.data["error"]["details"]


@pytest.mark.django_db
def test_disabling_consent_clears_consent_timestamp(client, owner):
    client.force_authenticate(owner)
    create_response = client.post(
        reverse("customer-list"),
        {
            "full_name": "Consent Customer",
            "whatsapp_number": "+93700123456",
            "whatsapp_consent": True,
        },
    )
    customer_id = create_response.data["data"]["id"]

    response = client.patch(
        reverse("customer-detail", kwargs={"pk": customer_id}),
        {"whatsapp_consent": False},
    )

    assert response.status_code == 200
    assert response.data["data"]["whatsapp_consent"] is False
    assert response.data["data"]["whatsapp_consent_at"] is None


@pytest.mark.django_db
def test_customer_list_supports_search_and_pagination(client, owner, customer):
    Customer.objects.create(full_name="Different Person")
    client.force_authenticate(owner)

    response = client.get(reverse("customer-list"), {"search": "Ahmad"})

    assert response.status_code == 200
    assert response.data["meta"]["count"] == 1
    assert response.data["data"][0]["id"] == str(customer.id)


@pytest.mark.django_db
def test_customer_list_includes_ledger_derived_current_debt(client, owner, customer):
    CustomerLedgerEntry.objects.create(
        customer=customer,
        entry_type=EntryType.DEBIT,
        amount=Decimal("5000.00"),
        created_by=owner,
    )
    CustomerLedgerEntry.objects.create(
        customer=customer,
        entry_type=EntryType.CREDIT,
        amount=Decimal("2000.00"),
        created_by=owner,
    )
    client.force_authenticate(owner)

    response = client.get(reverse("customer-list"))

    assert response.status_code == 200
    assert Decimal(response.data["data"][0]["current_debt"]) == Decimal("3000.00")


@pytest.mark.django_db
def test_customer_payment_creates_credit_and_updates_balance(client, owner, customer):
    create_order(customer, owner, "1200.00")
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-payments", kwargs={"pk": customer.pk}),
        {"amount": "600.00", "payment_date": "2026-08-25", "description": "Cash payment"},
    )

    assert response.status_code == 201
    entry = CustomerLedgerEntry.objects.get(customer=customer, entry_type=EntryType.CREDIT)
    assert entry.amount == Decimal("600.00")
    assert entry.description == "Cash payment"
    assert Decimal(response.data["data"]["balance"]) == Decimal("600.00")


@pytest.mark.django_db
def test_customer_payment_limits_and_accounting_regression(client, owner, customer):
    order = create_order(customer, owner, "1000.00", "250.00")
    client.force_authenticate(owner)
    url = reverse("customer-payments", kwargs={"pk": customer.pk})

    partial = client.post(url, {"amount": "300.00", "payment_date": timezone.localdate()})
    exact = client.post(url, {"amount": "450.00", "payment_date": timezone.localdate()})

    assert partial.status_code == 201
    assert exact.status_code == 201
    order.refresh_from_db()
    assert order.paid_amount == Decimal("1000.00")
    assert Decimal(exact.data["data"]["balance"]) == Decimal("0.00")
    assert list(
        DesignOrderPayment.objects.filter(design_order=order).values_list("amount", flat=True)
    ) == [Decimal("450.00"), Decimal("300.00"), Decimal("250.00")]

    payment_count = DesignOrderPayment.objects.count()
    ledger_count = CustomerLedgerEntry.objects.count()
    overpayment = client.post(url, {"amount": "0.01"})
    assert overpayment.status_code == 400
    assert "پاتې حساب صفر" in str(overpayment.data)
    assert DesignOrderPayment.objects.count() == payment_count
    assert CustomerLedgerEntry.objects.count() == ledger_count


@pytest.mark.django_db
def test_customer_overpayment_has_zero_cash_report_and_database_effect(client, owner, customer):
    order = create_order(customer, owner, "1000.00", "900.00")
    client.force_authenticate(owner)
    today = timezone.localdate()
    payment_count = DesignOrderPayment.objects.count()
    ledger_count = CustomerLedgerEntry.objects.count()

    response = client.post(
        reverse("customer-payments", kwargs={"pk": customer.pk}),
        {"amount": "101.00", "payment_date": today},
    )

    assert response.status_code == 400
    assert "پاتې حساب 100.00 افغانۍ" in str(response.data)
    order.refresh_from_db()
    assert order.paid_amount == Decimal("900.00")
    assert DesignOrderPayment.objects.count() == payment_count
    assert CustomerLedgerEntry.objects.count() == ledger_count
    dashboard = client.get(
        reverse("dashboard"), {"period": "custom", "start_date": today, "end_date": today}
    ).data["data"]
    report = client.get(
        reverse("financial-report"),
        {"period": "custom", "start_date": today, "end_date": today},
    ).data["data"]
    assert dashboard["cards"]["received_payments"] == "900.00"
    assert report["summary"]["received_payments"] == "900.00"
    assert report["summary"]["customer_receivables"] == "100.00"


@pytest.mark.django_db
def test_customer_payment_ignores_cancelled_orders(client, owner, customer):
    cancelled = create_order(customer, owner, "500.00")
    active = create_order(customer, owner, "200.00")
    transition_design_order(
        order=cancelled,
        target_status=DesignOrderStatus.CANCELLED,
        changed_by=owner,
    )
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-payments", kwargs={"pk": customer.pk}), {"amount": "200.00"}
    )

    assert response.status_code == 201
    active.refresh_from_db()
    cancelled.refresh_from_db()
    assert active.paid_amount == Decimal("200.00")
    assert cancelled.paid_amount == Decimal("0.00")
    assert Decimal(response.data["data"]["balance"]) == Decimal("0.00")


@pytest.mark.django_db
def test_customer_payment_rejects_non_positive_amount(client, owner, customer):
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-payments", kwargs={"pk": customer.pk}), {"amount": "0"}
    )

    assert response.status_code == 400
    assert not CustomerLedgerEntry.objects.filter(customer=customer).exists()


@pytest.mark.django_db
def test_customer_can_be_archived_and_restored(client, owner, customer):
    client.force_authenticate(owner)

    archive_response = client.post(reverse("customer-archive", kwargs={"pk": customer.pk}))
    restore_response = client.post(reverse("customer-restore", kwargs={"pk": customer.pk}))

    assert archive_response.status_code == 200
    assert archive_response.data["data"]["is_active"] is False
    assert restore_response.status_code == 200
    assert restore_response.data["data"]["is_active"] is True


@pytest.mark.django_db
def test_viewer_cannot_access_customers(client, viewer):
    client.force_authenticate(viewer)

    response = client.get(reverse("customer-list"))

    assert response.status_code == 403


@pytest.mark.django_db
def test_customer_delete_is_not_available(client, owner, customer):
    client.force_authenticate(owner)

    response = client.delete(reverse("customer-detail", kwargs={"pk": customer.pk}))

    assert response.status_code == 405
