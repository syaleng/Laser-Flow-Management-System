from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.daily_journal.models import (
    DailyClosing,
    Expense,
    MoneyLoan,
    MoneyLoanRepayment,
    PayableAccount,
    PayableOrigin,
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
        category="MATERIALS",
        amount=Decimal("100.00"),
        expense_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    MoneyLoan.objects.create(
        person_name="Borrower",
        amount=Decimal("200.00"),
        loan_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    payable = PayableAccount.objects.create(
        person_name="Supplier",
        amount=Decimal("400.00"),
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
        "customer_payment",
        "expense",
        "loan_given",
        "payable_created",
        "payable_payment",
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


@pytest.mark.django_db
def test_cash_loan_received_is_cash_in_but_credit_purchase_is_not(users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 8, 25)
    cash_loan = PayableAccount.objects.create(
        person_name="Personal lender",
        debt_type="PERSONAL",
        origin=PayableOrigin.CASH_LOAN,
        amount=Decimal("5000.00"),
        payable_date=selected,
        purpose="Working cash",
        created_by=manager,
        updated_by=manager,
    )
    PayableAccount.objects.create(
        person_name="Diamond dealer",
        debt_type="COMPANY_SUPPLIER",
        origin=PayableOrigin.CREDIT_PURCHASE,
        amount=Decimal("5000.00"),
        payable_date=selected,
        purpose="Diamonds on credit",
        created_by=manager,
        updated_by=manager,
    )
    PayableRepayment.objects.create(
        payable_account=cash_loan,
        amount=Decimal("2000.00"),
        payment_date=selected,
        payment_method="CASH",
        created_by=manager,
    )

    client = APIClient()
    client.force_authenticate(manager)
    response = client.get(reverse("journal-summary"), {"date": selected})

    assert response.status_code == 200
    data = response.data["data"]
    assert data["money_received"] == Decimal("5000.00")
    assert data["payable_payments"] == Decimal("2000.00")
    assert data["closing_balance"] == Decimal("3000.00")
    assert data["total_payables"] == Decimal("8000.00")


@pytest.mark.django_db
def test_next_opening_uses_latest_previous_business_day_closing(users):
    manager = users[UserRole.MANAGER]
    DailyClosing.objects.create(
        closing_date=date(2026, 8, 28),
        opening_balance=Decimal("-25229.15"),
        closing_balance=Decimal("-24929.15"),
        closed_by=manager,
    )
    Expense.objects.create(
        category="OTHER",
        amount=Decimal("2500.00"),
        expense_date=date(2026, 8, 29),
        created_by=manager,
        updated_by=manager,
    )

    client = APIClient()
    client.force_authenticate(manager)
    response = client.get(reverse("journal-summary"), {"date": "2026-08-29"})

    assert response.status_code == 200
    assert response.data["data"]["opening_balance"] == Decimal("-24929.15")
    assert response.data["data"]["closing_balance"] == Decimal("-27429.15")


@pytest.mark.django_db
def test_cash_reconciliation_sets_actual_balance_and_can_be_voided(users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 9, 3)
    Expense.objects.create(
        category="OTHER",
        amount=Decimal("250.00"),
        expense_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    client = APIClient()
    client.force_authenticate(manager)
    created = client.post(
        reverse("cash-reconciliation-list"),
        {
            "reconciliation_date": str(selected),
            "actual_balance": "1000.00",
            "reason": "Physical cash count",
        },
    )
    assert created.status_code == 201
    assert Decimal(created.data["data"]["difference"]) == Decimal("1250.00")
    summary = client.get(reverse("journal-summary"), {"date": selected})
    assert Decimal(summary.data["data"]["closing_balance"]) == Decimal("1000.00")

    voided = client.post(
        reverse("cash-reconciliation-void", kwargs={"pk": created.data["data"]["id"]}),
        {"reason": "Count was incorrect"},
    )
    assert voided.status_code == 204
    summary = client.get(reverse("journal-summary"), {"date": selected})
    assert Decimal(summary.data["data"]["closing_balance"]) == Decimal("-250.00")


@pytest.mark.django_db
def test_cash_reconciliation_counts_only_real_cash_movements(users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 8, 30)
    DailyClosing.objects.create(
        closing_date=selected - timedelta(days=1),
        closing_balance=Decimal("1000.00"),
        closed_by=manager,
    )
    customer = Customer.objects.create(full_name="Cash customer")
    order = create_order(manager, customer, selected, Decimal("1000.00"))
    DesignOrderPayment.objects.create(
        design_order=order,
        amount=Decimal("400.00"),
        payment_date=selected,
        recorded_by=manager,
    )
    Expense.objects.create(
        category="OTHER",
        amount=Decimal("150.00"),
        expense_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    loan = MoneyLoan.objects.create(
        person_name="Borrower",
        amount=Decimal("200.00"),
        loan_date=selected,
        created_by=manager,
        updated_by=manager,
    )
    MoneyLoanRepayment.objects.create(
        money_loan=loan,
        amount=Decimal("50.00"),
        payment_date=selected,
        payment_method="CASH",
        created_by=manager,
    )
    cash_loan = PayableAccount.objects.create(
        person_name="Lender",
        origin=PayableOrigin.CASH_LOAN,
        amount=Decimal("500.00"),
        payable_date=selected,
        purpose="Cash loan",
        created_by=manager,
        updated_by=manager,
    )
    PayableRepayment.objects.create(
        payable_account=cash_loan,
        amount=Decimal("100.00"),
        payment_date=selected,
        payment_method="CASH",
        created_by=manager,
    )
    PayableAccount.objects.create(
        person_name="Material dealer",
        origin=PayableOrigin.CREDIT_PURCHASE,
        amount=Decimal("900.00"),
        payable_date=selected,
        purpose="Materials on credit",
        created_by=manager,
        updated_by=manager,
    )

    client = APIClient()
    client.force_authenticate(manager)
    data = client.get(reverse("journal-summary"), {"date": selected}).data["data"]

    assert data["opening_balance"] == Decimal("1000.00")
    assert data["customer_payments"] == Decimal("400.00")
    assert data["money_received"] == Decimal("500.00")
    assert data["loan_returns"] == Decimal("50.00")
    assert data["expenses"] == Decimal("150.00")
    assert data["loan_given"] == Decimal("200.00")
    assert data["payable_payments"] == Decimal("100.00")
    assert data["closing_balance"] == Decimal("1500.00")
