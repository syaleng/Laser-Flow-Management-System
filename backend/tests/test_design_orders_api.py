from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer
from apps.daily_journal.models import JournalActivity
from apps.design_orders.models import (
    DesignCategory,
    DesignOrder,
    DesignOrderPayment,
    DesignOrderStatus,
    DesignOrderStatusHistory,
)


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def operator(db):
    return User.objects.create_user(
        email="operator-orders@example.com",
        password="Strong-Test-Password-123!",
        full_name="Design Operator",
        role=UserRole.OPERATOR,
    )


@pytest.fixture
def viewer(db):
    return User.objects.create_user(
        email="viewer-orders@example.com",
        password="Strong-Test-Password-123!",
        full_name="Report Viewer",
        role=UserRole.VIEWER,
    )


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        email="manager-orders@example.com",
        password="Strong-Test-Password-123!",
        full_name="Order Manager",
        role=UserRole.MANAGER,
    )


@pytest.fixture
def customer(db):
    return Customer.objects.create(full_name="Maryam Fashion")


@pytest.fixture
def category(db):
    return DesignCategory.objects.get(name="Women's shirt decoration")


def order_payload(customer, category):
    today = date.today()
    return {
        "customer_id": str(customer.id),
        "design_category_id": str(category.id),
        "design_name": "Flower Border Design",
        "design_description": "Decorative flower border for a shirt.",
        "cut_quantity": 25,
        "unit_price": "40.00",
        "paid_amount": "400.00",
        "payment_status": "PARTIAL",
        "design_type": "JAR",
        "color_count": "2",
        "gemstone_size": 10,
        "baran_size_mm": "5.00",
        "order_date": today.isoformat(),
        "expected_delivery_date": (today + timedelta(days=3)).isoformat(),
        "notes": "Use the approved customer sample.",
    }


@pytest.mark.django_db
def test_operator_can_create_design_order(client, operator, customer, category):
    client.force_authenticate(operator)

    response = client.post(reverse("design-order-list"), order_payload(customer, category))

    assert response.status_code == 201
    assert response.data["data"]["order_number"].startswith("ORD-")
    assert Decimal(response.data["data"]["total_amount"]) == Decimal("1000.00")
    assert Decimal(response.data["data"]["paid_amount"]) == Decimal("400.00")
    assert Decimal(response.data["data"]["remaining_amount"]) == Decimal("600.00")
    assert response.data["data"]["customer"]["id"] == str(customer.id)
    assert response.data["data"]["design_type"] == "JAR"
    assert response.data["data"]["gemstone_size"] == 10
    assert DesignOrderStatusHistory.objects.filter(
        design_order_id=response.data["data"]["id"], to_status=DesignOrderStatus.NEW
    ).exists()


@pytest.mark.django_db
def test_fully_paid_order_rejects_credit_status(client, operator, customer, category):
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    payload.update(
        {
            "cut_quantity": 3,
            "unit_price": "40.00",
            "paid_amount": "120.00",
            "payment_status": "CREDIT",
        }
    )

    response = client.post(reverse("design-order-list"), payload)

    assert response.status_code == 400
    assert response.data["error"]["details"]["payment_status"][0] == (
        "ټولې پیسې ترلاسه شوې دي، د تادیې حالت بدلول امکان نه لري."
    )


@pytest.mark.django_db
def test_fully_paid_order_accepts_fully_paid_status(client, operator, customer, category):
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    payload.update(
        {
            "cut_quantity": 3,
            "unit_price": "40.00",
            "paid_amount": "120.00",
            "payment_status": "FULLY_PAID",
        }
    )

    response = client.post(reverse("design-order-list"), payload)

    assert response.status_code == 201
    assert response.data["data"]["payment_status"] == "FULLY_PAID"


@pytest.mark.django_db
def test_order_update_recalculates_total(client, operator, customer, category):
    client.force_authenticate(operator)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))
    order_id = created.data["data"]["id"]

    response = client.patch(
        reverse("design-order-detail", kwargs={"pk": order_id}),
        {"cut_quantity": 10, "unit_price": "75.50"},
    )

    assert response.status_code == 200
    assert Decimal(response.data["data"]["total_amount"]) == Decimal("755.00")


@pytest.mark.django_db
def test_payment_can_be_completed_after_design_work_starts(client, operator, customer, category):
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    created = client.post(reverse("design-order-list"), payload)
    order_id = created.data["data"]["id"]
    client.post(
        reverse("design-order-transition-status", kwargs={"pk": order_id}),
        {"status": DesignOrderStatus.DESIGN_PREPARATION},
    )
    response = client.post(
        reverse("design-order-record-payment", kwargs={"pk": order_id}),
        {"amount": "600.00"},
    )

    assert response.status_code == 201
    assert Decimal(response.data["data"]["remaining_amount"]) == Decimal("0.00")
    assert response.data["data"]["payment_status"] == "FULLY_PAID"


@pytest.mark.django_db
def test_new_payment_is_recorded_and_updates_order_totals(client, operator, customer, category):
    client.force_authenticate(operator)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))
    order_id = created.data["data"]["id"]

    response = client.post(
        reverse("design-order-record-payment", kwargs={"pk": order_id}),
        {"amount": "600.00", "note": "وروستۍ تادیه"},
    )

    assert response.status_code == 201
    assert Decimal(response.data["data"]["paid_amount"]) == Decimal("1000.00")
    assert Decimal(response.data["data"]["remaining_amount"]) == Decimal("0.00")
    assert response.data["data"]["payment_status"] == "FULLY_PAID"
    assert DesignOrderPayment.objects.filter(design_order_id=order_id).count() == 2


@pytest.mark.django_db
def test_new_payment_cannot_exceed_remaining_amount(client, operator, customer, category):
    client.force_authenticate(operator)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))

    response = client.post(
        reverse("design-order-record-payment", kwargs={"pk": created.data["data"]["id"]}),
        {"amount": "601.00"},
    )

    assert response.status_code == 400
    assert "amount" in response.data["error"]["details"]


@pytest.mark.django_db
def test_payment_creates_journal_activity_and_updates_daily_income(
    client, manager, customer, category
):
    client.force_authenticate(manager)
    payment_date = date.today() - timedelta(days=1)
    payload = order_payload(customer, category)
    payload.update(
        {
            "paid_amount": "0.00",
            "payment_status": "CREDIT",
            "order_date": payment_date.isoformat(),
        }
    )
    created = client.post(reverse("design-order-list"), payload)
    order_id = created.data["data"]["id"]

    payment_response = client.post(
        reverse("design-order-record-payment", kwargs={"pk": order_id}),
        {"amount": "300.00", "payment_date": payment_date.isoformat()},
    )
    summary_response = client.get(reverse("journal-summary"), {"date": payment_date.isoformat()})

    assert payment_response.status_code == 201
    assert summary_response.status_code == 200
    assert Decimal(summary_response.data["data"]["income"]) == Decimal("300.00")
    assert Decimal(summary_response.data["data"]["customer_debts"]) == Decimal("700.00")
    activity = JournalActivity.objects.get(
        entity_type="payment", entity_id=payment_response.data["payment"]["id"]
    )
    assert activity.action == "payment_received"
    assert activity.changed_fields["customer_name"] == customer.full_name
    assert activity.changed_fields["order_number"] == created.data["data"]["order_number"]
    assert activity.changed_fields["amount"] == "300.00"


@pytest.mark.django_db
def test_status_transitions_are_controlled(client, operator, customer, category):
    client.force_authenticate(operator)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))
    order_id = created.data["data"]["id"]
    status_url = reverse("design-order-transition-status", kwargs={"pk": order_id})

    invalid = client.post(status_url, {"status": DesignOrderStatus.CUTTING})
    valid = client.post(status_url, {"status": DesignOrderStatus.DESIGN_PREPARATION})

    assert invalid.status_code == 400
    assert valid.status_code == 200
    assert valid.data["data"]["status"] == DesignOrderStatus.DESIGN_PREPARATION


@pytest.mark.django_db
def test_delivery_records_actual_and_due_dates(client, operator, customer, category):
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    payload["order_date"] = (date.today() - timedelta(days=45)).isoformat()
    payload["expected_delivery_date"] = date.today().isoformat()
    created = client.post(reverse("design-order-list"), payload)
    order_id = created.data["data"]["id"]
    status_url = reverse("design-order-transition-status", kwargs={"pk": order_id})

    for target in (
        DesignOrderStatus.DESIGN_PREPARATION,
        DesignOrderStatus.CUTTING,
        DesignOrderStatus.READY_FOR_DELIVERY,
        DesignOrderStatus.DELIVERED,
    ):
        response = client.post(status_url, {"status": target})
        assert response.status_code == 200

    order = DesignOrder.objects.get(pk=order_id)
    assert order.actual_delivery_date == date.today()
    assert order.payment_due_date == date.today() - timedelta(days=15)


@pytest.mark.django_db
def test_new_order_payment_due_date_is_calculated_from_order_date(
    client, operator, customer, category
):
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    payload["order_date"] = (date.today() - timedelta(days=31)).isoformat()
    payload["expected_delivery_date"] = date.today().isoformat()

    response = client.post(reverse("design-order-list"), payload)

    assert response.status_code == 201
    order = DesignOrder.objects.get(pk=response.data["data"]["id"])
    assert order.payment_due_date == date.today() - timedelta(days=1)


@pytest.mark.django_db
def test_archived_customer_cannot_receive_new_order(client, operator, customer, category):
    customer.is_active = False
    customer.save(update_fields=["is_active"])
    client.force_authenticate(operator)

    response = client.post(reverse("design-order-list"), order_payload(customer, category))

    assert response.status_code == 400
    assert "customer_id" in response.data["error"]["details"]


@pytest.mark.django_db
def test_viewer_cannot_access_design_orders(client, viewer):
    client.force_authenticate(viewer)
    assert client.get(reverse("design-order-list")).status_code == 403


@pytest.mark.django_db
def test_search_finds_order_by_customer(client, operator, customer, category):
    client.force_authenticate(operator)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))

    response = client.get(reverse("design-order-list"), {"search": "Maryam"})

    assert response.status_code == 200
    assert response.data["meta"]["count"] == 1
    assert response.data["data"][0]["id"] == created.data["data"]["id"]


@pytest.mark.django_db
def test_outstanding_payment_filter_excludes_settled_and_cancelled_orders(
    client, operator, customer, category
):
    client.force_authenticate(operator)
    outstanding = client.post(reverse("design-order-list"), order_payload(customer, category))
    settled_payload = order_payload(customer, category)
    settled_payload.update({"paid_amount": "1000.00", "payment_status": "FULLY_PAID"})
    client.post(reverse("design-order-list"), settled_payload)
    cancelled = client.post(reverse("design-order-list"), order_payload(customer, category))
    client.post(
        reverse("design-order-transition-status", kwargs={"pk": cancelled.data["data"]["id"]}),
        {"status": DesignOrderStatus.CANCELLED},
    )

    response = client.get(reverse("design-order-list"), {"payment_filter": "outstanding"})

    assert response.status_code == 200
    assert [item["id"] for item in response.data["data"]] == [outstanding.data["data"]["id"]]


@pytest.mark.django_db
def test_manager_receives_overdue_debt_reminder_with_whatsapp_link(
    client, manager, customer, category
):
    customer.whatsapp_number = "+93700123456"
    customer.whatsapp_consent = True
    customer.save(update_fields=["whatsapp_number", "whatsapp_consent"])
    client.force_authenticate(manager)
    created = client.post(reverse("design-order-list"), order_payload(customer, category))
    DesignOrder.objects.filter(pk=created.data["data"]["id"]).update(
        payment_due_date=date.today() - timedelta(days=1)
    )

    response = client.get(reverse("design-order-overdue-reminders"))

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["data"][0]["remaining_amount"] == "600.00"
    assert response.data["data"][0]["whatsapp_url"].startswith("https://wa.me/93700123456")


@pytest.mark.django_db
def test_operator_cannot_access_admin_debt_reminders(client, operator):
    client.force_authenticate(operator)
    assert client.get(reverse("design-order-overdue-reminders")).status_code == 403


def image_file(name):
    content = BytesIO()
    Image.new("RGB", (2, 2), color="white").save(content, format="PNG")
    return SimpleUploadedFile(name, content.getvalue(), content_type="image/png")


@pytest.mark.django_db
def test_order_creation_ignores_file_upload_fields(client, operator, customer, category, settings):
    settings.MEDIA_ROOT = settings.BASE_DIR / "media" / "test-uploads"
    client.force_authenticate(operator)
    payload = order_payload(customer, category)
    payload.update(
        {
            "customer_reference_image": image_file("customer-sample.png"),
            "design_preview_image": image_file("prepared-preview.png"),
            "design_file_reference": SimpleUploadedFile(
                "laser-design.cdr", b"coreldraw-test-reference", "application/octet-stream"
            ),
        }
    )

    response = client.post(reverse("design-order-list"), payload, format="multipart")

    assert response.status_code == 201
    order = DesignOrder.objects.get(pk=response.data["data"]["id"])
    assert order.design_name == payload["design_name"]
    assert not order.customer_reference_image
    assert not order.design_preview_image
    assert not order.design_file_reference
