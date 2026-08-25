from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.daily_journal.models import (
    Expense,
    MoneyLoan,
    PayableAccount,
    PayableRepayment,
)
from apps.design_orders.models import DesignCategory, DesignOrder, DesignOrderPayment


@pytest.fixture
def users(db):
    return {
        role: User.objects.create_user(
            email=f"journal-{role.lower()}@example.com",
            password="Strong-Test-Password-123!",
            full_name=f"Journal {role.title()}",
            role=role,
        )
        for role in (UserRole.MANAGER, UserRole.OPERATOR)
    }


def create_order(user, customer, event_date, amount):
    return DesignOrder.objects.create(
        customer=customer,
        design_category=DesignCategory.objects.create(name=f"Category {event_date}"),
        design_name="Journal order",
        cut_quantity=1,
        unit_price=amount,
        order_date=event_date,
        expected_delivery_date=event_date + timedelta(days=2),
        payment_status="CREDIT",
        design_type="SIMPLE",
        color_count="1",
        gemstone_size=5,
        baran_size_mm=Decimal("4.00"),
        created_by=user,
    )


@pytest.mark.django_db
def test_daily_summary_separates_cash_closing_from_sales_and_classifies_transactions(users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 8, 24)
    customer = Customer.objects.create(full_name="Journal Customer")
    previous = create_order(manager, customer, selected - timedelta(days=1), Decimal("1000.00"))
    current = create_order(manager, customer, selected, Decimal("2000.00"))
    DesignOrderPayment.objects.create(
        design_order=previous,
        amount=Decimal("500.00"),
        payment_date=selected - timedelta(days=1),
        recorded_by=manager,
    )
    DesignOrderPayment.objects.create(
        design_order=current, amount=Decimal("300.00"), payment_date=selected, recorded_by=manager
    )
    Expense.objects.create(
        category="MATERIALS", amount=Decimal("100.00"), expense_date=selected,
        created_by=manager, updated_by=manager,
    )
    MoneyLoan.objects.create(
        person_name="Borrower", amount=Decimal("200.00"), loan_date=selected,
        created_by=manager, updated_by=manager,
    )
    payable = PayableAccount.objects.create(
        person_name="Supplier", amount=Decimal("400.00"), payable_date=selected,
        purpose="Materials", created_by=manager, updated_by=manager,
    )
    PayableRepayment.objects.create(
        payable_account=payable, amount=Decimal("100.00"), payment_date=selected,
        created_by=manager,
    )

    client = APIClient()
    client.force_authenticate(manager)
    response = client.get(reverse("journal-summary"), {"date": selected})

    assert response.status_code == 200
    data = response.data["data"]
    assert data["opening_balance"] == Decimal("500.00")
    assert data["customer_payments"] == Decimal("300.00")
    assert data["loan_given"] == Decimal("200.00")
    assert data["payable_payments"] == Decimal("100.00")
    assert data["closing_balance"] == Decimal("400.00")
    assert data["sales"] == Decimal("2000.00")
    assert data["net_profit"] == Decimal("1900.00")
    assert {item["transaction_type"] for item in data["transactions"]} == {
        "customer_payment", "expense", "loan_given", "payable_created", "payable_payment",
    }
    assert all(item["user"] == manager.full_name for item in data["transactions"])


@pytest.mark.django_db
def test_daily_closing_persists_calculated_balances_and_checks_permissions(users):
    manager = users[UserRole.MANAGER]
    client = APIClient()
    response = client.post(reverse("journal-close"), {"date": "2026-08-24"})
    assert response.status_code == 401

    client.force_authenticate(users[UserRole.OPERATOR])
    assert client.post(reverse("journal-close"), {"date": "2026-08-24"}).status_code == 403

    client.force_authenticate(manager)
    response = client.post(reverse("journal-close"), {"date": "2026-08-24"})
    assert response.status_code == 201
    assert response.data["data"]["opening_balance"] == "0.00"
    assert response.data["data"]["closing_balance"] == "0.00"
