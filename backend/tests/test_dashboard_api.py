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
    MoneyLoanRepayment,
    PayableAccount,
    PayableRepayment,
)
from apps.design_orders.models import DesignCategory, DesignOrder, DesignOrderPayment
from apps.suppliers.models import Supplier, SupplierTransaction


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def users(db):
    return {
        role: User.objects.create_user(
            email=f"dashboard-{role.lower()}@example.com",
            password="Strong-Test-Password-123!",
            full_name=f"Dashboard {role.title()}",
            role=role,
        )
        for role in (UserRole.MANAGER, UserRole.VIEWER, UserRole.OPERATOR)
    }


def create_order(user, event_date, amount=Decimal("1000.00")):
    customer = Customer.objects.create(full_name=f"Customer {event_date}")
    category = DesignCategory.objects.first()
    return DesignOrder.objects.create(
        customer=customer,
        design_category=category,
        design_name="Dashboard order",
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
def test_dashboard_calculates_finances_charts_debt_and_activity(client, users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 8, 20)
    order = create_order(manager, selected)
    DesignOrderPayment.objects.create(
        design_order=order,
        amount=Decimal("400.00"),
        payment_date=selected,
        recorded_by=manager,
    )
    Expense.objects.create(
        category="MATERIALS",
        amount=Decimal("125.00"),
        expense_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    loan = MoneyLoan.objects.create(
        person_name="Borrower",
        amount=Decimal("300.00"),
        loan_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    MoneyLoanRepayment.objects.create(
        money_loan=loan,
        amount=Decimal("50.00"),
        payment_date=selected,
        created_by=manager,
    )
    payable = PayableAccount.objects.create(
        person_name="Supplier",
        amount=Decimal("500.00"),
        payable_date=selected,
        purpose="Materials",
        created_by=manager,
        updated_by=manager,
    )
    PayableRepayment.objects.create(
        payable_account=payable,
        amount=Decimal("100.00"),
        payment_date=selected,
        created_by=manager,
    )
    supplier = Supplier.objects.create(name="New supplier")
    SupplierTransaction.objects.create(
        supplier=supplier,
        transaction_type="DEBIT",
        amount="500.00",
        description="Diamonds",
        transaction_date=selected,
        created_by=manager,
    )
    SupplierTransaction.objects.create(
        supplier=supplier,
        transaction_type="CREDIT",
        amount="200.00",
        description="Supplier payment",
        transaction_date=selected,
        created_by=manager,
    )

    client.force_authenticate(manager)
    response = client.get(
        reverse("dashboard"),
        {"period": "custom", "start_date": selected, "end_date": selected},
    )

    assert response.status_code == 200
    data = response.data["data"]
    assert data["cards"] == {
        "orders": 1,
        "received_payments": "400.00",
        "sales": "1000.00",
        "expenses": "125.00",
        "supplier_payments": "200.00",
        "profit_loss": "875.00",
        "cash_balance": "-275.00",
        "customer_receivables": "600.00",
        "shop_payables": "700.00",
        "net_financial_position": "150.00",
    }
    assert data["debt"]["loan_receivables"] == "250.00"
    assert data["charts"]["income_expense_profit"][0]["profit"] == "875.00"
    assert data["charts"]["expense_categories"][0]["category"] == "MATERIALS"
    assert data["charts"]["expense_categories"][0]["label"] == "مواد"
    assert {item["type"] for item in data["recent_activity"]} == {
        "order",
        "payment",
        "expense",
        "loan_repayment",
        "payable_repayment",
        "supplier_payment",
    }
    assert all(item["user"] == manager.full_name for item in data["recent_activity"])


@pytest.mark.django_db
def test_dashboard_custom_date_filter_excludes_outside_transactions(client, users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 7, 10)
    inside = create_order(manager, selected)
    outside = create_order(manager, selected - timedelta(days=1))
    outside.status = "CANCELLED"
    outside.save(update_fields=["status"])
    for order, payment_date in ((inside, selected), (outside, selected - timedelta(days=1))):
        DesignOrderPayment.objects.create(
            design_order=order,
            amount=Decimal("100.00"),
            payment_date=payment_date,
            recorded_by=manager,
        )

    client.force_authenticate(manager)
    response = client.get(
        reverse("dashboard"),
        {"period": "custom", "start_date": selected, "end_date": selected},
    )

    assert response.status_code == 200
    assert response.data["data"]["cards"]["orders"] == 1
    assert response.data["data"]["cards"]["received_payments"] == "100.00"
    assert response.data["data"]["cards"]["cash_balance"] == "100.00"
    assert len(response.data["data"]["charts"]["order_trend"]) == 1


@pytest.mark.django_db
def test_dashboard_permissions_follow_view_reports_capability(client, users):
    url = reverse("dashboard")
    assert client.get(url).status_code == 401

    client.force_authenticate(users[UserRole.OPERATOR])
    assert client.get(url).status_code == 403

    client.force_authenticate(users[UserRole.VIEWER])
    assert client.get(url).status_code == 200


@pytest.mark.django_db
def test_dashboard_rejects_invalid_custom_range(client, users):
    client.force_authenticate(users[UserRole.VIEWER])
    response = client.get(
        reverse("dashboard"),
        {"period": "custom", "start_date": "2026-08-20", "end_date": "2026-08-10"},
    )
    assert response.status_code == 400
