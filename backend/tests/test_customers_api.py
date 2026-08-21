import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.customers.models import Customer


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="customer-owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Shop Owner",
        role=UserRole.OWNER,
    )


@pytest.fixture
def viewer(db):
    return User.objects.create_user(
        email="customer-viewer@example.com",
        password="Strong-Test-Password-123!",
        full_name="Report Viewer",
        role=UserRole.VIEWER,
    )


@pytest.fixture
def customer(db):
    return Customer.objects.create(
        full_name="Ahmad Customer",
        phone="0700000000",
        whatsapp_number="+93700000000",
    )


@pytest.mark.django_db
def test_owner_can_create_customer_with_whatsapp_consent(client, owner):
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-list"),
        {
            "full_name": "  Maryam Customer  ",
            "phone": "0799999999",
            "whatsapp_number": "0700123456",
            "whatsapp_consent": True,
            "address": "Kabul",
            "notes": "Prefers WhatsApp contact",
        },
    )

    assert response.status_code == 201
    assert response.data["data"]["customer_code"].startswith("CUS-")
    assert response.data["data"]["full_name"] == "Maryam Customer"
    assert response.data["data"]["whatsapp_number"] == "+93700123456"
    assert response.data["data"]["whatsapp_consent_at"] is not None


@pytest.mark.django_db
def test_consent_requires_whatsapp_number(client, owner):
    client.force_authenticate(owner)

    response = client.post(
        reverse("customer-list"),
        {"full_name": "No WhatsApp", "whatsapp_consent": True},
    )

    assert response.status_code == 400
    assert "whatsapp_number" in response.data["error"]["details"]


@pytest.mark.django_db
def test_disabling_consent_clears_consent_timestamp(client, owner):
    client.force_authenticate(owner)
    create_response = client.post(
        reverse("customer-list"),
        {
            "full_name": "Consent Customer",
            "whatsapp_number": "+93700123456",
            "whatsapp_consent": True,
        },
    )
    customer_id = create_response.data["data"]["id"]

    response = client.patch(
        reverse("customer-detail", kwargs={"pk": customer_id}),
        {"whatsapp_consent": False},
    )

    assert response.status_code == 200
    assert response.data["data"]["whatsapp_consent"] is False
    assert response.data["data"]["whatsapp_consent_at"] is None


@pytest.mark.django_db
def test_customer_list_supports_search_and_pagination(client, owner, customer):
    Customer.objects.create(full_name="Different Person")
    client.force_authenticate(owner)

    response = client.get(reverse("customer-list"), {"search": "Ahmad"})

    assert response.status_code == 200
    assert response.data["meta"]["count"] == 1
    assert response.data["data"][0]["id"] == str(customer.id)


@pytest.mark.django_db
def test_customer_can_be_archived_and_restored(client, owner, customer):
    client.force_authenticate(owner)

    archive_response = client.post(reverse("customer-archive", kwargs={"pk": customer.pk}))
    restore_response = client.post(reverse("customer-restore", kwargs={"pk": customer.pk}))

    assert archive_response.status_code == 200
    assert archive_response.data["data"]["is_active"] is False
    assert restore_response.status_code == 200
    assert restore_response.data["data"]["is_active"] is True


@pytest.mark.django_db
def test_viewer_cannot_access_customers(client, viewer):
    client.force_authenticate(viewer)

    response = client.get(reverse("customer-list"))

    assert response.status_code == 403


@pytest.mark.django_db
def test_customer_delete_is_not_available(client, owner, customer):
    client.force_authenticate(owner)

    response = client.delete(reverse("customer-detail", kwargs={"pk": customer.pk}))

    assert response.status_code == 405
