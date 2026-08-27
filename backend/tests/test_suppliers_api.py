from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.suppliers.models import Supplier, SupplierTransaction
from apps.suppliers.services import get_supplier_balance


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="supplier-owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Shop Owner",
        role=UserRole.OWNER,
    )


@pytest.mark.django_db
def test_create_supplier(client, owner):
    client.force_authenticate(owner)
    response = client.post(
        reverse("supplier-list"),
        {"name": "Karimullah", "phone": "0700000000", "description": "Materials"},
    )
    assert response.status_code == 201
    assert Supplier.objects.filter(name="Karimullah", is_active=True).exists()


@pytest.mark.django_db
def test_supplier_debit_credit_and_balance(client, owner):
    client.force_authenticate(owner)
    supplier = Supplier.objects.create(name="Karimullah")
    debit = client.post(
        reverse("supplier-debit", kwargs={"pk": supplier.pk}),
        {"amount": "5000", "description": "Material purchase", "transaction_date": "2026-08-26"},
    )
    credit = client.post(
        reverse("supplier-credit", kwargs={"pk": supplier.pk}),
        {"amount": "2000", "description": "Paid cash", "transaction_date": "2026-08-30"},
    )
    assert debit.status_code == credit.status_code == 201
    assert debit.data["transaction"]["transaction_type"] == "DEBIT"
    assert credit.data["transaction"]["transaction_type"] == "CREDIT"
    assert Decimal(credit.data["updated_supplier_balance"]) == Decimal("3000")
    assert get_supplier_balance(supplier=supplier) == Decimal("3000")


@pytest.mark.django_db
@pytest.mark.parametrize("amount", ["0", "-1"])
def test_supplier_transaction_rejects_invalid_amount(client, owner, amount):
    client.force_authenticate(owner)
    supplier = Supplier.objects.create(name="Invalid Test Supplier")
    response = client.post(
        reverse("supplier-debit", kwargs={"pk": supplier.pk}),
        {"amount": amount, "description": "Invalid"},
    )
    assert response.status_code == 400
    assert not supplier.transactions.exists()


@pytest.mark.django_db
def test_supplier_transaction_requires_description(client, owner):
    client.force_authenticate(owner)
    supplier = Supplier.objects.create(name="Description Test")
    response = client.post(reverse("supplier-debit", kwargs={"pk": supplier.pk}), {"amount": "100"})
    assert response.status_code == 400


@pytest.mark.django_db
def test_supplier_payment_cannot_exceed_remaining_amount(client, owner):
    client.force_authenticate(owner)
    supplier = Supplier.objects.create(name="Balance Test")
    SupplierTransaction.objects.create(
        supplier=supplier,
        transaction_type="DEBIT",
        amount="100",
        description="Materials",
        created_by=owner,
    )
    response = client.post(
        reverse("supplier-credit", kwargs={"pk": supplier.pk}),
        {"amount": "101", "description": "Too much"},
    )
    assert response.status_code == 400
    assert not supplier.transactions.filter(transaction_type="CREDIT").exists()


@pytest.mark.django_db
def test_supplier_transaction_history_is_ordered(client, owner):
    client.force_authenticate(owner)
    supplier = Supplier.objects.create(name="History Test")
    for date, amount in (("2026-08-30", "200"), ("2026-08-26", "500")):
        SupplierTransaction.objects.create(
            supplier=supplier,
            transaction_type="DEBIT",
            amount=amount,
            description="Materials",
            transaction_date=date,
            created_by=owner,
        )
    response = client.get(reverse("supplier-transactions", kwargs={"pk": supplier.pk}))
    assert response.status_code == 200
    assert [entry["transaction_date"] for entry in response.data["data"]["entries"]] == [
        "2026-08-26",
        "2026-08-30",
    ]
    assert [Decimal(entry["balance"]) for entry in response.data["data"]["entries"]] == [
        Decimal("500"),
        Decimal("700"),
    ]
