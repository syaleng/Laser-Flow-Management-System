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
            email=f"report-{role.lower()}@example.com",
            password="Password-123!",
            full_name=f"Report {role.title()}",
            role=role,
        )
        for role in (UserRole.MANAGER, UserRole.VIEWER, UserRole.OPERATOR)
    }


def order(
    user, customer, event_date, amount=Decimal("1000.00"), status="NEW", payment_status="PARTIAL"
):
    return DesignOrder.objects.create(
        customer=customer,
        design_category=DesignCategory.objects.first(),
        design_name="Report order",
        cut_quantity=1,
        unit_price=amount,
        order_date=event_date,
        expected_delivery_date=event_date + timedelta(days=2),
        actual_delivery_date=event_date if status == "DELIVERED" else None,
        status=status,
        payment_status=payment_status,
        design_type="SIMPLE",
        color_count="1",
        gemstone_size=5,
        baran_size_mm=Decimal("4.00"),
        created_by=user,
    )


@pytest.mark.django_db
def test_report_calculations_customer_debt_and_repayment_history(client, users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 8, 20)
    customer = Customer.objects.create(full_name="Ahmad Customer")
    design_order = order(manager, customer, selected)
    DesignOrderPayment.objects.create(
        design_order=design_order,
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
        money_loan=loan, amount=Decimal("50.00"), payment_date=selected, created_by=manager
    )
    payable = PayableAccount.objects.create(
        person_name="Supplier",
        amount=Decimal("500.00"),
        payable_date=selected,
        purpose="Material",
        created_by=manager,
        updated_by=manager,
    )
    PayableRepayment.objects.create(
        payable_account=payable, amount=Decimal("100.00"), payment_date=selected, created_by=manager
    )
    supplier = Supplier.objects.create(name="New supplier", description="Diamonds")
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
        reverse("financial-report"),
        {"period": "custom", "start_date": selected, "end_date": selected},
    )

    assert response.status_code == 200
    report = response.data["data"]
    assert report["summary"] == {
        "total_orders": 1,
        "total_sales": "1000.00",
        "received_payments": "400.00",
        "expenses": "125.00",
        "supplier_payments": "300.00",
        "profit_loss": "875.00",
        "customer_receivables": "600.00",
        "shop_payables": "700.00",
        "loan_balances": "250.00",
        "cash_movement": "-275.00",
    }
    assert report["customers"][0]["customer_name"] == customer.full_name
    assert report["customers"][0]["payment_history"][0]["amount"] == "400.00"
    assert report["debts"]["customer_receivables"][0]["remaining_balance"] == "600.00"
    assert report["debts"]["shop_payables"][0]["remaining_balance"] == "400.00"
    assert report["debts"]["loan_repayments"][0]["amount"] == "50.00"
    assert report["charts"]["financial_trend"][0]["profit"] == "875.00"


@pytest.mark.django_db
def test_report_date_customer_and_status_filters(client, users):
    manager = users[UserRole.MANAGER]
    selected = date(2026, 7, 10)
    included_customer = Customer.objects.create(full_name="Included")
    excluded_customer = Customer.objects.create(full_name="Excluded")
    included = order(
        manager, included_customer, selected, status="DELIVERED", payment_status="FULLY_PAID"
    )
    order(manager, excluded_customer, selected, status="NEW", payment_status="CREDIT")
    order(
        manager,
        included_customer,
        selected - timedelta(days=1),
        status="DELIVERED",
        payment_status="FULLY_PAID",
    )
    DesignOrderPayment.objects.create(
        design_order=included, amount=Decimal("1000.00"), payment_date=selected, recorded_by=manager
    )

    client.force_authenticate(manager)
    response = client.get(
        reverse("financial-report"),
        {
            "period": "custom",
            "start_date": selected,
            "end_date": selected,
            "customer_id": included_customer.id,
            "status": "DELIVERED",
            "payment_status": "FULLY_PAID",
        },
    )

    assert response.status_code == 200
    assert response.data["data"]["summary"]["total_orders"] == 1
    assert response.data["data"]["summary"]["received_payments"] == "1000.00"
    assert {row["customer_name"] for row in response.data["data"]["customers"]} == {"Included"}


@pytest.mark.django_db
def test_report_permissions(client, users):
    url = reverse("financial-report")
    assert client.get(url).status_code == 401
    client.force_authenticate(users[UserRole.OPERATOR])
    assert client.get(url).status_code == 403
    client.force_authenticate(users[UserRole.VIEWER])
    assert client.get(url).status_code == 200


@pytest.mark.django_db
def test_report_rejects_reversed_custom_range(client, users):
    client.force_authenticate(users[UserRole.VIEWER])
    response = client.get(
        reverse("financial-report"),
        {"period": "custom", "start_date": "2026-08-20", "end_date": "2026-08-01"},
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_order_payment_expense_and_report_reconcile_through_apis(client, users):
    manager = users[UserRole.MANAGER]
    selected = date.today()
    customer = Customer.objects.create(full_name="Reconciliation Customer")
    category = DesignCategory.objects.first()
    client.force_authenticate(manager)

    created = client.post(
        reverse("design-order-list"),
        {
            "customer_id": customer.id,
            "design_category_id": category.id,
            "design_name": "Reconciliation order",
            "design_description": "",
            "cut_quantity": 10,
            "unit_price": "1000.00",
            "paid_amount": "0.00",
            "payment_status": "CREDIT",
            "status": "NEW",
            "design_type": "SIMPLE",
            "color_count": "1",
            "gemstone_size": 5,
            "baran_size_mm": "4.00",
            "order_date": selected,
            "expected_delivery_date": selected + timedelta(days=2),
            "notes": "",
        },
    )
    assert created.status_code == 201
    order_id = created.data["data"]["id"]
    payment = client.post(
        reverse("design-order-record-payment", kwargs={"pk": order_id}),
        {"amount": "600.00", "payment_date": selected},
    )
    expense = client.post(
        reverse("journal-expense-list"),
        {
            "category": "MATERIALS",
            "amount": "150.00",
            "expense_date": selected,
            "note": "Reconciliation material",
        },
    )
    report = client.get(
        reverse("financial-report"),
        {"period": "daily", "date": selected, "customer_id": customer.id},
    )

    assert payment.status_code == 201
    assert expense.status_code == 201
    assert report.status_code == 200
    summary = report.data["data"]["summary"]
    assert summary["total_sales"] == "1000.00"
    assert summary["received_payments"] == "600.00"
    assert summary["expenses"] == "0.00"
    assert summary["supplier_payments"] == "0.00"
    assert summary["profit_loss"] == "1000.00"
    assert summary["customer_receivables"] == "400.00"
    assert summary["cash_movement"] == "600.00"
