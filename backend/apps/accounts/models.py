from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel

from .managers import UserManager


class UserRole(models.TextChoices):
    OWNER = "OWNER", _("Owner")
    MANAGER = "MANAGER", _("Manager")
    OPERATOR = "OPERATOR", _("Operator")
    VIEWER = "VIEWER", _("Viewer")


class User(BaseModel, AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(_("email address"), unique=True, db_index=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.VIEWER)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["full_name", "email"]
        constraints = [
            models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique"),
        ]

    def __str__(self) -> str:
        return self.full_name or self.email

    @property
    def is_owner(self) -> bool:
        return self.role == UserRole.OWNER

    def has_capability(self, capability) -> bool:
        from .authorization import user_has_capability

        return user_has_capability(self, capability)


class LoginActivity(BaseModel):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_activities",
    )
    username = models.CharField(max_length=254, db_index=True)
    successful = models.BooleanField(db_index=True)
    user_role = models.CharField(max_length=20, choices=UserRole.choices, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["-created_at", "successful"], name="login_activity_time_status_idx"
            )
        ]

    def __str__(self) -> str:
        status = "successful" if self.successful else "failed"
        return f"{self.username} - {status}"
