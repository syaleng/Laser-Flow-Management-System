import uuid
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel
from apps.customers.models import Customer

from .validators import (
    validate_design_file,
    validate_preview_image,
    validate_reference_image,
)


def generate_order_number() -> str:
    return f"ORD-{timezone.localdate().year}-{uuid.uuid4().hex[:8].upper()}"


def reference_image_path(instance, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    return f"design-orders/{instance.id}/customer-reference/{uuid.uuid4().hex}{extension}"


def preview_image_path(instance, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    return f"design-orders/{instance.id}/preview/{uuid.uuid4().hex}{extension}"


def design_file_path(instance, filename: str) -> str:
    extension = Path(filename).suffix.lower()
    return f"design-orders/{instance.id}/source/{uuid.uuid4().hex}{extension}"


class DesignOrderStatus(models.TextChoices):
    NEW = "NEW", _("New")
    DESIGN_PREPARATION = "DESIGN_PREPARATION", _("Design preparation")
    CUTTING = "CUTTING", _("Cutting")
    READY_FOR_DELIVERY = "READY_FOR_DELIVERY", _("Ready for delivery")
    DELIVERED = "DELIVERED", _("Delivered")
    CANCELLED = "CANCELLED", _("Cancelled")


class PaymentStatus(models.TextChoices):
    CASH = "CASH", _("Cash")
    PARTIAL = "PARTIAL", _("Partially paid")
    CREDIT = "CREDIT", _("Credit")
    FULLY_PAID = "FULLY_PAID", _("Fully paid")


class DesignType(models.TextChoices):
    JAR = "JAR", _("Jar")
    SIMPLE = "SIMPLE", _("Simple")


class DesignColorCount(models.TextChoices):
    ONE = "1", _("1 color")
    TWO = "2", _("2 colors")


class DesignCategory(BaseModel):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "design categories"

    def __str__(self) -> str:
        return self.name


class DesignOrder(BaseModel):
    order_number = models.CharField(
        max_length=22, unique=True, default=generate_order_number, editable=False
    )
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="design_orders")
    design_category = models.ForeignKey(
        DesignCategory,
        on_delete=models.PROTECT,
        related_name="design_orders",
        null=True,
        blank=True,
    )
    design_name = models.CharField(max_length=200, blank=True)
    design_description = models.TextField(blank=True)
    customer_reference_image = models.ImageField(
        upload_to=reference_image_path,
        validators=[validate_reference_image],
        blank=True,
    )
    design_preview_image = models.ImageField(
        upload_to=preview_image_path,
        validators=[validate_preview_image],
        blank=True,
    )
    design_file_reference = models.FileField(
        upload_to=design_file_path,
        validators=[validate_design_file],
        blank=True,
    )
    design_file_name = models.CharField(max_length=255, blank=True)
    design_file_type = models.CharField(max_length=20, blank=True)
    cut_quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, editable=False)
    material_quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    order_date = models.DateField(default=timezone.localdate, db_index=True)
    expected_delivery_date = models.DateField(db_index=True)
    actual_delivery_date = models.DateField(null=True, blank=True, db_index=True)
    payment_due_date = models.DateField(null=True, blank=True, db_index=True)
    status = models.CharField(
        max_length=30,
        choices=DesignOrderStatus.choices,
        default=DesignOrderStatus.NEW,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREDIT,
        db_index=True,
    )
    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    design_type = models.CharField(max_length=10, choices=DesignType.choices)
    color_count = models.CharField(max_length=1, choices=DesignColorCount.choices)
    gemstone_size = models.PositiveSmallIntegerField()
    baran_size_mm = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_design_orders",
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(cut_quantity__gt=0), name="design_order_quantity_positive"
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gt=0), name="design_order_price_positive"
            ),
            models.CheckConstraint(
                condition=Q(total_amount__gt=0), name="design_order_total_positive"
            ),
            models.CheckConstraint(
                condition=Q(expected_delivery_date__gte=F("order_date")),
                name="design_order_delivery_after_order",
            ),
            models.CheckConstraint(
                condition=(
                    Q(status=DesignOrderStatus.DELIVERED, actual_delivery_date__isnull=False)
                    | (
                        ~Q(status=DesignOrderStatus.DELIVERED)
                        & Q(actual_delivery_date__isnull=True)
                    )
                ),
                name="design_order_actual_date_matches_status",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "order_date"], name="design_order_status_date_idx"),
            models.Index(fields=["customer", "-created_at"], name="design_order_customer_idx"),
        ]

    def clean(self):
        super().clean()
        if self.material_quantity is not None and self.unit_price is not None:
            self.total_amount = Decimal(self.material_quantity) * self.unit_price

    def save(self, *args, **kwargs):
        self.total_amount = Decimal(self.material_quantity) * self.unit_price
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            changed_fields = set(update_fields)
            calculated_fields = []
            if {"material_quantity", "unit_price"} & changed_fields:
                calculated_fields.append("total_amount")
            kwargs["update_fields"] = [*changed_fields, *calculated_fields]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.order_number} — {self.design_name}"


class DesignOrderStatusHistory(BaseModel):
    design_order = models.ForeignKey(
        DesignOrder, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(
        max_length=30, choices=DesignOrderStatus.choices, null=True, blank=True
    )
    to_status = models.CharField(max_length=30, choices=DesignOrderStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="design_order_status_changes",
    )
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["design_order", "created_at"], name="order_history_date_idx")
        ]


class DesignOrderPayment(BaseModel):
    design_order = models.ForeignKey(
        DesignOrder, on_delete=models.PROTECT, related_name="payment_history"
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_date = models.DateField(default=timezone.localdate, db_index=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="recorded_design_order_payments",
    )
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["design_order", "-created_at"], name="order_payment_date_idx")
        ]
