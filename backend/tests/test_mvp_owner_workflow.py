from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.design_orders.models import DesignCategory


@pytest.mark.django_db
def test_owner_business_workflow_reconciles_customer_supplier_expense_and_cash():
    owner = User.objects.create_user(
        email="mvp-owner@example.com",
        password="Strong-MVP-Password-123!",
        full_name="MVP Owner",
        role=UserRole.OWNER,
    )
    client = APIClient()
    client.force_authenticate(owner)
    selected = date.today()

    customer_response = client.post(
        reverse("customer-list"),
        {"full_name": "احمد خیاط", "phone": "0700000000"},
    )
    assert customer_response.status_code == 201
    customer_id = customer_response.data["data"]["id"]

    order_response = client.post(
        reverse("design-order-list"),
        {
            "customer_id": customer_id,
            "design_category_id": str(DesignCategory.objects.first().id),
            "design_name": "د کمیس ډیزاین",
            "design_description": "لس ډایان",
            "cut_quantity": 1,
            "material_quantity": 10,
            "unit_price": "100.00",
            "paid_amount": "0.00",
            "payment_status": "CREDIT",
            "status": "NEW",
            "design_type": "SIMPLE",
            "color_count": "1",
            "gemstone_size": 6,
            "baran_size_mm": "5.00",
            "order_date": selected,
            "expected_delivery_date": selected + timedelta(days=2),
        },
    )
    assert order_response.status_code == 201
    order_id = order_response.data["data"]["id"]
    assert Decimal(order_response.data["data"]["total_amount"]) == Decimal("1000.00")

    payment_response = client.post(
        reverse("design-order-record-payment", kwargs={"pk": order_id}),
        {"amount": "400.00", "payment_date": selected},
    )
    assert payment_response.status_code == 201

    statement = client.get(reverse("customer-statement", kwargs={"pk": customer_id})).data["data"]
    ledger = client.get(reverse("customer-ledger", kwargs={"pk": customer_id})).data["data"]
    assert Decimal(statement["remaining_balance"]) == Decimal("600.00")
    assert Decimal(ledger["remaining_debt_balance"]) == Decimal("600.00")
    assert [Decimal(entry["balance_after_transaction"]) for entry in ledger["entries"]] == [
        Decimal("1000.00"),
        Decimal("600.00"),
    ]

    supplier_response = client.post(
        reverse("supplier-list"),
        {"name": "کریم الله", "phone": "0700111222"},
    )
    assert supplier_response.status_code == 201
    supplier_id = supplier_response.data["data"]["id"]
    assert (
        client.post(
            reverse("supplier-debit", kwargs={"pk": supplier_id}),
            {
                "amount": "500.00",
                "description": "د ماشین خدمت",
                "transaction_date": selected,
            },
        ).status_code
        == 201
    )
    supplier_payment = client.post(
        reverse("supplier-credit", kwargs={"pk": supplier_id}),
        {
            "amount": "200.00",
            "description": "عرضه کوونکي ته ورکړه",
            "transaction_date": selected,
        },
    )
    assert supplier_payment.status_code == 201
    assert Decimal(supplier_payment.data["updated_supplier_balance"]) == Decimal("300.00")

    expense_response = client.post(
        reverse("journal-expense-list"),
        {
            "category": "DIAMONDS",
            "amount": "150.00",
            "expense_date": selected,
            "note": "نغدي ډایان",
        },
    )
    assert expense_response.status_code == 201
    assert expense_response.data["category_label"] == "د ډایانو اخیستل"

    dashboard = client.get(
        reverse("dashboard"),
        {"period": "custom", "start_date": selected, "end_date": selected},
    ).data["data"]["cards"]
    report = client.get(
        reverse("financial-report"),
        {"period": "daily", "date": selected},
    ).data["data"]["summary"]
    journal = client.get(reverse("journal-summary"), {"date": selected}).data["data"]

    assert Decimal(dashboard["sales"]) == Decimal(report["total_sales"]) == Decimal("1000")
    assert Decimal(dashboard["customer_receivables"]) == Decimal("600")
    assert Decimal(dashboard["shop_payables"]) == Decimal(report["shop_payables"]) == Decimal("300")
    assert Decimal(dashboard["expenses"]) == Decimal(report["expenses"]) == Decimal("150")
    assert Decimal(dashboard["profit_loss"]) == Decimal(report["profit_loss"]) == Decimal("850")
    assert Decimal(dashboard["cash_balance"]) == Decimal(journal["cash_balance"]) == Decimal("50")
    assert Decimal(report["supplier_payments"]) == Decimal("200")
