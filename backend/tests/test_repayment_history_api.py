from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.daily_journal.models import JournalActivity


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email="repayment-manager@example.com",
        password="Strong-Test-Password-123!",
        full_name="Repayment Manager",
        role=UserRole.MANAGER,
    )


@pytest.fixture
def viewer(db):
    return User.objects.create_user(
        email="repayment-viewer@example.com",
        password="Strong-Test-Password-123!",
        full_name="Repayment Viewer",
        role=UserRole.VIEWER,
    )


def loan_payload():
    return {
        "person_name": "Ahmad Supplier",
        "debt_type": "PERSONAL",
        "amount": "100000.00",
        "returned_amount": "0.00",
        "purpose": "Working capital",
        "loan_date": date.today().isoformat(),
        "note": "Original loan",
    }


def payable_payload():
    return {
        "person_name": "Material Supplier",
        "debt_type": "COMPANY_SUPPLIER",
        "amount": "80000.00",
        "paid_amount": "0.00",
        "purpose": "Materials",
        "payable_date": date.today().isoformat(),
        "note": "Supplier account",
    }


@pytest.mark.django_db
def test_loan_repayment_updates_balance_status_and_activity(client, manager):
    client.force_authenticate(manager)
    created = client.post(reverse("journal-loan-list"), loan_payload())
    repayment = client.post(
        reverse("journal-loan-repayments", kwargs={"pk": created.data["id"]}),
        {
            "amount": "20000.00",
            "payment_date": date.today(),
            "payment_method": "BANK",
            "note": "First return",
        },
    )

    assert repayment.status_code == 201
    assert Decimal(repayment.data["data"]["returned_amount"]) == Decimal("20000.00")
    assert Decimal(repayment.data["data"]["remaining_balance"]) == Decimal("80000.00")
    assert repayment.data["data"]["status"] == "PARTIALLY_RETURNED"
    history = client.get(reverse("journal-loan-repayments", kwargs={"pk": created.data["id"]}))
    assert history.status_code == 200
    assert history.data["data"][0]["payment_method"] == "BANK"
    activity = JournalActivity.objects.get(entity_type="loan_repayment")
    assert activity.changed_fields["person_name"] == "Ahmad Supplier"
    assert activity.changed_fields["amount"] == "20000.00"
    assert activity.changed_fields["recorded_by"] == manager.full_name


@pytest.mark.django_db
def test_payable_repayment_cannot_exceed_remaining_balance(client, manager):
    client.force_authenticate(manager)
    created = client.post(reverse("journal-payable-list"), payable_payload())
    response = client.post(
        reverse("journal-payable-repayments", kwargs={"pk": created.data["id"]}),
        {"amount": "80000.01", "payment_date": date.today(), "payment_method": "CASH"},
    )
    assert response.status_code == 400
    assert "amount" in response.data["error"]["details"]


@pytest.mark.django_db
def test_viewer_cannot_manage_repayments(client, manager, viewer):
    client.force_authenticate(manager)
    created = client.post(reverse("journal-loan-list"), loan_payload())
    client.force_authenticate(viewer)
    response = client.post(
        reverse("journal-loan-repayments", kwargs={"pk": created.data["id"]}),
        {"amount": "100.00", "payment_date": date.today(), "payment_method": "OTHER"},
    )
    assert response.status_code == 403
