import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.accounts.authorization import Capability
from apps.accounts.models import LoginActivity, User, UserRole


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def owner(db):
    return User.objects.create_user(
        email="owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Shop Owner",
        role=UserRole.OWNER,
    )


@pytest.mark.django_db
def test_login_sets_refresh_cookie_and_returns_access_token(client, owner):
    response = client.post(
        reverse("accounts:login"),
        {"email": owner.email, "password": "Strong-Test-Password-123!"},
    )

    assert response.status_code == 200
    assert "access" in response.data["data"]
    assert response.data["data"]["user"]["role"] == UserRole.OWNER
    assert response.cookies["laserflow_refresh"]["httponly"] is True
    activity = LoginActivity.objects.get()
    assert activity.successful is True
    assert activity.username == owner.email
    assert activity.user_role == UserRole.OWNER


@pytest.mark.django_db
def test_login_accepts_unique_email_username(client):
    User.objects.create_user(
        email="bilal@laserflow.local",
        password="bilal123",
        full_name="Bilal",
        role=UserRole.OWNER,
    )
    response = client.post(
        reverse("accounts:login"),
        {"email": "bilal", "password": "bilal123"},
    )
    assert response.status_code == 200
    assert response.data["data"]["user"]["email"] == "bilal@laserflow.local"


@pytest.mark.django_db
def test_failed_login_is_recorded_without_password(client, owner):
    response = client.post(
        reverse("accounts:login"),
        {"email": owner.email, "password": "wrong-password"},
        HTTP_USER_AGENT="LaserFlow test browser",
    )

    assert response.status_code == 400
    activity = LoginActivity.objects.get()
    assert activity.successful is False
    assert activity.username == owner.email
    assert activity.user_role == UserRole.OWNER
    assert activity.user_agent == "LaserFlow test browser"
    assert not hasattr(activity, "password")


@pytest.mark.django_db
def test_me_requires_authentication(client):
    response = client.get(reverse("accounts:me"))
    assert response.status_code == 401


@pytest.mark.django_db
def test_authenticated_user_can_read_profile(client, owner):
    client.force_authenticate(owner)
    response = client.get(reverse("accounts:me"))
    assert response.status_code == 200
    assert response.data["data"]["email"] == owner.email


@pytest.mark.django_db
def test_refresh_rotates_cookie_and_returns_new_access_token(client, owner):
    login_response = client.post(
        reverse("accounts:login"),
        {"email": owner.email, "password": "Strong-Test-Password-123!"},
    )
    original_cookie = login_response.cookies["laserflow_refresh"].value
    client.cookies["laserflow_refresh"] = original_cookie

    response = client.post(reverse("accounts:token-refresh"))

    assert response.status_code == 200
    assert "access" in response.data["data"]
    assert response.cookies["laserflow_refresh"].value != original_cookie


@pytest.mark.django_db
def test_logout_blacklists_refresh_token(client, owner):
    login_response = client.post(
        reverse("accounts:login"),
        {"email": owner.email, "password": "Strong-Test-Password-123!"},
    )
    client.cookies["laserflow_refresh"] = login_response.cookies["laserflow_refresh"].value

    response = client.post(reverse("accounts:logout"))

    assert response.status_code == 204
    assert BlacklistedToken.objects.count() == 1


@pytest.mark.django_db
def test_inactive_user_cannot_log_in(client, owner):
    owner.is_active = False
    owner.save(update_fields=["is_active"])

    response = client.post(
        reverse("accounts:login"),
        {"email": owner.email, "password": "Strong-Test-Password-123!"},
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_user_can_change_password(client, owner):
    client.force_authenticate(owner)
    response = client.post(
        reverse("accounts:change-password"),
        {
            "current_password": "Strong-Test-Password-123!",
            "new_password": "New-Strong-Test-Password-456!",
        },
    )

    assert response.status_code == 204
    owner.refresh_from_db()
    assert owner.check_password("New-Strong-Test-Password-456!")


@pytest.mark.django_db
def test_manager_cannot_manage_users(client):
    manager = User.objects.create_user(
        email="manager@example.com",
        password="Strong-Test-Password-123!",
        full_name="Shop Manager",
        role=UserRole.MANAGER,
    )
    client.force_authenticate(manager)

    response = client.get(reverse("user-list"))

    assert response.status_code == 403


@pytest.mark.django_db
def test_owner_can_create_user_with_normalized_email(client, owner):
    client.force_authenticate(owner)
    response = client.post(
        reverse("user-list"),
        {
            "email": "Operator@EXAMPLE.COM",
            "full_name": "Laser Operator",
            "phone": "0700000000",
            "role": UserRole.OPERATOR,
            "password": "Strong-Operator-Password-123!",
        },
    )

    assert response.status_code == 201
    assert response.data["email"] == "operator@example.com"


@pytest.mark.django_db
def test_owner_cannot_deactivate_self(client, owner):
    client.force_authenticate(owner)

    response = client.post(reverse("user-deactivate", kwargs={"pk": owner.pk}))

    assert response.status_code == 400
    owner.refresh_from_db()
    assert owner.is_active is True


@pytest.mark.django_db
def test_owner_can_reset_another_users_password(client, owner):
    operator = User.objects.create_user(
        email="operator@example.com",
        password="Strong-Old-Password-123!",
        full_name="Operator",
        role=UserRole.OPERATOR,
    )
    client.force_authenticate(owner)
    response = client.post(
        reverse("user-reset-password", kwargs={"pk": operator.pk}),
        {"new_password": "Strong-New-Password-456!"},
    )
    assert response.status_code == 204
    operator.refresh_from_db()
    assert operator.check_password("Strong-New-Password-456!")


def test_role_capabilities_are_explicit():
    assert Capability.MANAGE_USERS in owner_capabilities()
    assert Capability.MANAGE_USERS not in manager_capabilities()
    assert Capability.MANAGE_DESIGN_ORDERS in manager_capabilities()


def owner_capabilities():
    from apps.accounts.authorization import ROLE_CAPABILITIES

    return ROLE_CAPABILITIES[UserRole.OWNER]


def manager_capabilities():
    from apps.accounts.authorization import ROLE_CAPABILITIES

    return ROLE_CAPABILITIES[UserRole.MANAGER]
