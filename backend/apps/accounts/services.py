from collections.abc import Mapping

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import User, UserRole


def _ensure_owner_remains(user: User, changes: Mapping) -> None:
    removes_active_owner = (
        user.role == UserRole.OWNER
        and user.is_active
        and (
            changes.get("role", user.role) != UserRole.OWNER
            or changes.get("is_active", user.is_active) is False
        )
    )
    if (
        removes_active_owner
        and not User.objects.filter(role=UserRole.OWNER, is_active=True)
        .exclude(pk=user.pk)
        .exists()
    ):
        raise ValidationError({"role": "At least one active owner must remain."})


@transaction.atomic
def create_user(*, data: dict) -> User:
    return User.objects.create_user(**data)


@transaction.atomic
def update_user(*, user: User, data: dict, actor: User | None = None) -> User:
    if actor == user and (
        data.get("is_active") is False or data.get("role", user.role) != user.role
    ):
        raise ValidationError({"user": "You cannot deactivate or change your own role."})
    _ensure_owner_remains(user, data)
    for field, value in data.items():
        setattr(user, field, value)
    user.full_clean(exclude=["password"])
    user.save(update_fields=[*data.keys(), "updated_at"])
    return user


@transaction.atomic
def set_user_active(*, user: User, is_active: bool, actor: User) -> User:
    return update_user(user=user, data={"is_active": is_active}, actor=actor)


@transaction.atomic
def change_password(*, user: User, new_password: str) -> None:
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
