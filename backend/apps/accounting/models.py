from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.common.models import BaseModel
from apps.customers.models import Customer


class EntryType(models.TextChoices):
    DEBIT = "DEBIT", "Debit"
    CREDIT = "CREDIT", "Credit"


class CustomerLedgerEntry(BaseModel):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="ledger_entries")
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    source_type = models.CharField(max_length=50, blank=True)
    source_id = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="customer_ledger_entries",
    )
    posted_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-posted_at", "-created_at"]
        indexes = [
            models.Index(fields=["customer", "posted_at"], name="ledger_customer_posted_idx"),
            models.Index(fields=["source_type", "source_id"], name="ledger_source_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.customer} - {self.entry_type} - {self.amount}"
