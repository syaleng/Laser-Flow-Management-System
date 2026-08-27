from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import BaseModel


class Supplier(BaseModel):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=30, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


class SupplierTransaction(BaseModel):
    class TransactionType(models.TextChoices):
        DEBIT = "DEBIT", "Debit"
        CREDIT = "CREDIT", "Credit"

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="transactions")
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    description = models.CharField(max_length=255)
    transaction_date = models.DateField(default=timezone.localdate, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="supplier_transactions"
    )

    class Meta:
        ordering = ["transaction_date", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0), name="supplier_transaction_amount_positive"
            )
        ]
