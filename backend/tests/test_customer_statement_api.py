from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.design_orders.models import (
    DesignCategory,
    DesignOrder,
    DesignOrderPayment,
    DesignOrderStatus,
    DesignType,
)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="statement-owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Statement Owner",
        role=UserRole.OWNER,
    )


@pytest.fixture
def customer(db):
    return Customer.objects.create(full_name="Statement Customer")


@pytest.fixture
def category(db):
    return DesignCategory.objects.get(name="Women's shirt decoration")


def create_order(owner, customer, category, *, quantity, unit_price, status=DesignOrderStatus.NEW):
    return DesignOrder.objects.create(
        customer=customer,
        design_category=category,
        design_name="Statement design",
        cut_quantity=quantity,
        unit_price=unit_price,
        order_date=date.today(),
        expected_delivery_date=date.today() + timedelta(days=3),
        status=status,
        payment_status="CREDIT",
        paid_amount=Decimal("0.00"),
        design_type=DesignType.SIMPLE,
        color_count="1",
        gemstone_size=6,
        baran_size_mm=Decimal("5.00"),
        created_by=owner,
    )


@pytest.mark.django_db
def test_customer_statement_calculates_summary_and_histories(client, owner, customer, category):
    order = create_order(owner, customer, category, quantity=10, unit_price=Decimal("100.00"))
    DesignOrderPayment.objects.create(
        design_order=order,
        amount=Decimal("400.00"),
        recorded_by=owner,
        note="Deposit",
    )

    client.force_authenticate(owner)
    response = client.get(reverse("customer-statement", kwargs={"pk": customer.pk}))

    assert response.status_code == 200
    statement = response.data["data"]
    assert statement["total_orders"] == 1
    assert Decimal(statement["total_amount"]) == Decimal("1000.00")
    assert Decimal(statement["total_paid"]) == Decimal("400.00")
    assert Decimal(statement["remaining_balance"]) == Decimal("600.00")
    assert statement["orders"][0]["order_number"] == order.order_number
    assert Decimal(statement["orders"][0]["paid_amount"]) == Decimal("400.00")
    assert Decimal(statement["orders"][0]["remaining_amount"]) == Decimal("600.00")
    assert statement["payments"][0]["order_number"] == order.order_number
    assert statement["payments"][0]["recorded_user"] == owner.full_name


@pytest.mark.django_db
def test_customer_statement_excludes_cancelled_orders_and_payments(
    client, owner, customer, category
):
    order = create_order(
        owner,
        customer,
        category,
        quantity=5,
        unit_price=Decimal("100.00"),
        status=DesignOrderStatus.CANCELLED,
    )
    DesignOrderPayment.objects.create(
        design_order=order,
        amount=Decimal("100.00"),
        recorded_by=owner,
    )

    client.force_authenticate(owner)
    response = client.get(reverse("customer-statement", kwargs={"pk": customer.pk}))

    assert response.status_code == 200
    statement = response.data["data"]
    assert statement["total_orders"] == 0
    assert Decimal(statement["total_amount"]) == Decimal("0.00")
    assert statement["orders"] == []
    assert statement["payments"] == []


@pytest.mark.django_db
def test_customer_ledger_returns_summary_and_running_balance(client, owner, customer, category):
    order = create_order(owner, customer, category, quantity=10, unit_price=Decimal("100.00"))
    payment = DesignOrderPayment.objects.create(
        design_order=order,
        amount=Decimal("400.00"),
        recorded_by=owner,
        note="Deposit",
    )

    client.force_authenticate(owner)
    response = client.get(reverse("customer-ledger", kwargs={"pk": customer.pk}))

    assert response.status_code == 200
    ledger = response.data["data"]
    assert ledger["customer_name"] == customer.full_name
    assert Decimal(ledger["total_orders_amount"]) == Decimal("1000.00")
    assert Decimal(ledger["total_paid_amount"]) == Decimal("400.00")
    assert Decimal(ledger["remaining_debt_balance"]) == Decimal("600.00")
    assert len(ledger["entries"]) == 2
    assert ledger["entries"][0]["type"] == "Order"
    assert Decimal(ledger["entries"][0]["amount"]) == Decimal("1000.00")
    assert Decimal(ledger["entries"][1]["amount"]) == Decimal("-400.00")
    assert Decimal(ledger["entries"][1]["balance_after_transaction"]) == Decimal("600.00")
    assert ledger["entries"][1]["source_id"] == str(payment.id)
