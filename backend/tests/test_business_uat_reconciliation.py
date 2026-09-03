from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.daily_journal import services as journal_services
from apps.daily_journal.models import Expense, LoanStatus, MoneyLoan, PayableAccount
from apps.design_orders import services as order_services
from apps.design_orders.models import DesignCategory, DesignOrder, DesignOrderStatus, PaymentStatus

ZERO = Decimal("0.00")


@pytest.fixture
def uat_ledger(db):
    event_date = date.today() - timedelta(days=1)
    manager = User.objects.create_user(
        email="uat-manager@example.com",
        password="Strong-UAT-Password-123!",
        full_name="UAT Manager",
        role=UserRole.MANAGER,
    )
    customers = [
        Customer.objects.create(full_name="Ahmad Fashion"),
        Customer.objects.create(full_name="Karim Tailoring"),
        Customer.objects.create(full_name="Mina Boutique"),
    ]
    category = DesignCategory.objects.first()

    def create_order(customer, amount, status, *, actual_delivery_date=None):
        return DesignOrder.objects.create(
            customer=customer,
            design_category=category,
            design_name=f"UAT {customer.full_name}",
            cut_quantity=1,
            unit_price=amount,
            order_date=event_date,
            expected_delivery_date=event_date + timedelta(days=2),
            actual_delivery_date=actual_delivery_date,
            status=status,
            payment_status=PaymentStatus.CREDIT,
            design_type="SIMPLE",
            color_count="1",
            gemstone_size=5,
            baran_size_mm=Decimal("4.00"),
            created_by=manager,
        )

    fully_paid = create_order(
        customers[0],
        Decimal("1000.00"),
        DesignOrderStatus.DELIVERED,
        actual_delivery_date=event_date,
    )
    partially_paid = create_order(customers[1], Decimal("2000.00"), DesignOrderStatus.CUTTING)
    unpaid = create_order(customers[2], Decimal("1500.00"), DesignOrderStatus.NEW)
    cancelled = create_order(customers[0], Decimal("500.00"), DesignOrderStatus.CANCELLED)

    order_services.record_design_order_payment(
        order=fully_paid,
        amount=Decimal("1000.00"),
        payment_date=event_date,
        recorded_by=manager,
        note="Full payment",
    )
    order_services.record_design_order_payment(
        order=partially_paid,
        amount=Decimal("500.00"),
        payment_date=event_date,
        recorded_by=manager,
        note="Deposit",
    )
    order_services.record_design_order_payment(
        order=partially_paid,
        amount=Decimal("300.00"),
        payment_date=event_date,
        recorded_by=manager,
        note="Second payment",
    )

    for category_name, amount in (
        ("ELECTRICITY_WATER", "200.00"),
        ("RENT", "1000.00"),
        ("OTHER", "300.00"),
    ):
        Expense.objects.create(
            category=category_name,
            amount=Decimal(amount),
            expense_date=event_date,
            note="UAT expense",
            created_by=manager,
            updated_by=manager,
        )

    partial_loan = MoneyLoan.objects.create(
        person_name="Partial borrower",
        amount=Decimal("1000.00"),
        loan_date=event_date,
        created_by=manager,
        updated_by=manager,
    )
    settled_loan = MoneyLoan.objects.create(
        person_name="Settled borrower",
        amount=Decimal("500.00"),
        loan_date=event_date,
        created_by=manager,
        updated_by=manager,
    )
    journal_services.record_loan_repayment(
        loan=partial_loan,
        data={
            "amount": Decimal("400.00"),
            "payment_date": event_date,
            "payment_method": "CASH",
            "note": "Partial",
        },
        created_by=manager,
    )
    journal_services.record_loan_repayment(
        loan=settled_loan,
        data={
            "amount": Decimal("500.00"),
            "payment_date": event_date,
            "payment_method": "BANK",
            "note": "Settled",
        },
        created_by=manager,
    )

    open_payable = PayableAccount.objects.create(
        person_name="Open supplier",
        amount=Decimal("800.00"),
        payable_date=event_date,
        purpose="Materials",
        created_by=manager,
        updated_by=manager,
    )
    partial_payable = PayableAccount.objects.create(
        person_name="Partial supplier",
        amount=Decimal("1000.00"),
        payable_date=event_date,
        purpose="Machine service",
        created_by=manager,
        updated_by=manager,
    )
    settled_payable = PayableAccount.objects.create(
        person_name="Settled supplier",
        amount=Decimal("600.00"),
        payable_date=event_date,
        purpose="Rent support",
        created_by=manager,
        updated_by=manager,
    )
    journal_services.record_payable_repayment(
        payable=partial_payable,
        data={
            "amount": Decimal("250.00"),
            "payment_date": event_date,
            "payment_method": "CASH",
            "note": "Partial",
        },
        created_by=manager,
    )
    journal_services.record_payable_repayment(
        payable=settled_payable,
        data={
            "amount": Decimal("600.00"),
            "payment_date": event_date,
            "payment_method": "BANK",
            "note": "Settled",
        },
        created_by=manager,
    )
    return {
        "date": event_date,
        "manager": manager,
        "customers": customers,
        "orders": (fully_paid, partially_paid, unpaid, cancelled),
        "loans": (partial_loan, settled_loan),
        "payables": (open_payable, partial_payable, settled_payable),
    }


@pytest.mark.django_db
def test_realistic_ledger_reconciles_payments_statements_journal_dashboard_and_reports(
    uat_ledger,
):
    client = APIClient()
    client.force_authenticate(uat_ledger["manager"])
    event_date = uat_ledger["date"]

    payments = client.get(reverse("payments"), {"page_size": 100})
    statements = [
        client.get(reverse("customer-statement", kwargs={"pk": customer.id})).data["data"]
        for customer in uat_ledger["customers"]
    ]
    journal = client.get(reverse("journal-summary"), {"date": event_date}).data["data"]
    journal_report = client.get(
        reverse("journal-reports"), {"date": event_date, "period": "daily"}
    ).data["data"]
    dashboard = client.get(
        reverse("dashboard"),
        {"period": "custom", "start_date": event_date, "end_date": event_date},
    ).data["data"]
    report = client.get(
        reverse("financial-report"),
        {"period": "custom", "start_date": event_date, "end_date": event_date},
    ).data["data"]

    payment_total = sum((Decimal(item["amount"]) for item in payments.data["data"]), ZERO)
    statement_paid = sum((Decimal(item["total_paid"]) for item in statements), ZERO)
    statement_remaining = sum((Decimal(item["remaining_balance"]) for item in statements), ZERO)

    assert payments.status_code == 200
    assert payment_total == statement_paid == Decimal("1800.00")
    assert statement_remaining == Decimal("2700.00")
    assert [Decimal(item["remaining_balance"]) for item in statements] == [
        ZERO,
        Decimal("1200.00"),
        Decimal("1500.00"),
    ]
    assert statements[1]["total_paid"] == "800.00"
    assert len(statements[1]["payments"]) == 2
    assert str(statements[1]["payments"][0]["payment_date"]) == str(event_date)

    assert Decimal(journal["income"]) == Decimal(journal_report["income"]) == Decimal("1800.00")
    assert Decimal(dashboard["cards"]["received_payments"]) == Decimal("1800.00")
    assert Decimal(report["summary"]["received_payments"]) == Decimal("1800.00")
    assert Decimal(journal["expenses"]) == Decimal(journal_report["expenses"]) == Decimal("1500.00")
    assert Decimal(dashboard["cards"]["expenses"]) == Decimal("1500.00")
    assert Decimal(report["summary"]["expenses"]) == Decimal("1500.00")
    assert Decimal(journal["net_profit"]) == Decimal("3000.00")
    assert Decimal(dashboard["cards"]["profit_loss"]) == Decimal("3000.00")
    assert Decimal(report["summary"]["profit_loss"]) == Decimal("3000.00")
    assert Decimal(journal["customer_debts"]) == Decimal("2700.00")
    assert Decimal(dashboard["cards"]["customer_receivables"]) == Decimal("2700.00")
    assert Decimal(report["summary"]["customer_receivables"]) == Decimal("2700.00")
    assert Decimal(journal["money_loan_receivables"]) == Decimal("600.00")
    assert Decimal(dashboard["debt"]["loan_receivables"]) == Decimal("600.00")
    assert Decimal(report["summary"]["loan_balances"]) == Decimal("600.00")
    assert Decimal(journal["total_payables"]) == Decimal("1550.00")
    assert Decimal(dashboard["cards"]["shop_payables"]) == Decimal("1550.00")
    assert Decimal(report["summary"]["shop_payables"]) == Decimal("1550.00")
    assert Decimal(journal["cash_balance"]) == Decimal(journal_report["cash_balance"])
    # The bank-method loan return is not physical shop cash.
    assert Decimal(report["summary"]["cash_movement"]) == Decimal("-1050.00")
    assert Decimal(journal["cash_balance"]) == Decimal("-1050.00")


@pytest.mark.django_db
def test_realistic_loan_and_payable_states_and_histories(uat_ledger):
    partial_loan, settled_loan = uat_ledger["loans"]
    open_payable, partial_payable, settled_payable = uat_ledger["payables"]
    partial_loan.refresh_from_db()
    settled_loan.refresh_from_db()

    assert partial_loan.status == LoanStatus.PARTIALLY_RETURNED
    assert partial_loan.total_returned == Decimal("400.00")
    assert partial_loan.remaining_balance == Decimal("600.00")
    assert settled_loan.status == LoanStatus.RETURNED
    assert settled_loan.remaining_balance == ZERO
    assert open_payable.status == "OPEN" and open_payable.remaining_balance == Decimal("800.00")
    assert partial_payable.status == "PARTIAL"
    assert partial_payable.total_paid == Decimal("250.00")
    assert partial_payable.remaining_balance == Decimal("750.00")
    assert settled_payable.status == "PAID" and settled_payable.remaining_balance == ZERO
