import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.common.models import BaseModel

from .validators import normalize_whatsapp_number


def generate_customer_code() -> str:
    return f"CUS-{uuid.uuid4().hex[:12].upper()}"


class Customer(BaseModel):
    customer_code = models.CharField(
        max_length=16,
        unique=True,
        default=generate_customer_code,
        editable=False,
    )
    full_name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=30, blank=True, db_index=True)
    whatsapp_number = models.CharField(max_length=20, blank=True, db_index=True)
    whatsapp_consent = models.BooleanField(default=False, db_index=True)
    whatsapp_consent_at = models.DateTimeField(null=True, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["full_name", "customer_code"]
        constraints = [
            models.CheckConstraint(
                condition=Q(whatsapp_consent=False) | ~Q(whatsapp_number=""),
                name="customer_consent_requires_whatsapp",
            ),
        ]
        indexes = [
            models.Index(fields=["is_active", "full_name"], name="customer_active_name_idx"),
            models.Index(fields=["created_at"], name="customer_created_idx"),
        ]

    def clean(self):
        super().clean()
        self.full_name = self.full_name.strip()
        self.phone = self.phone.strip()
        if self.whatsapp_number:
            self.whatsapp_number = normalize_whatsapp_number(self.whatsapp_number)
        if self.whatsapp_consent and not self.whatsapp_number:
            raise ValidationError(
                {"whatsapp_number": "A WhatsApp number is required before consent can be enabled."}
            )

    def __str__(self) -> str:
        return f"{self.full_name} ({self.customer_code})"
