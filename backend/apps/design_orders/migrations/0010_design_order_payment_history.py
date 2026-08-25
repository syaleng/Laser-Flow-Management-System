import uuid
from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def seed_existing_payments(apps, schema_editor):
    order_model = apps.get_model("design_orders", "DesignOrder")
    payment_model = apps.get_model("design_orders", "DesignOrderPayment")
    for order in order_model.objects.filter(paid_amount__gt=0).iterator():
        payment = payment_model.objects.create(
            design_order_id=order.id,
            amount=order.paid_amount,
            recorded_by_id=order.created_by_id,
            note="لومړنۍ تادیه",
        )
        payment_model.objects.filter(pk=payment.pk).update(
            created_at=order.created_at,
            updated_at=order.created_at,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("design_orders", "0009_normalize_payment_status_from_amounts"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DesignOrderPayment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=14,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=500)),
                (
                    "design_order",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payment_history",
                        to="design_orders.designorder",
                    ),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="recorded_design_order_payments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="designorderpayment",
            index=models.Index(
                fields=["design_order", "-created_at"], name="order_payment_date_idx"
            ),
        ),
        migrations.RunPython(seed_existing_payments, migrations.RunPython.noop),
    ]
