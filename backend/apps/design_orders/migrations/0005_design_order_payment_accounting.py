from decimal import Decimal

import django.core.validators
from django.db import migrations, models


def normalize_payment_statuses(apps, schema_editor):
    order_model = apps.get_model("design_orders", "DesignOrder")
    order_model.objects.filter(payment_status="PAID_CASH").update(payment_status="FULLY_PAID")
    order_model.objects.filter(payment_status="CREDIT").update(payment_status="UNPAID")


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0004_design_order_specifications")]

    operations = [
        migrations.AddField(
            model_name="designorder",
            name="paid_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.RunPython(normalize_payment_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="designorder",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("FULLY_PAID", "Fully paid"),
                    ("PARTIAL", "Partially paid"),
                    ("UNPAID", "Unpaid"),
                ],
                db_index=True,
                default="UNPAID",
                max_length=20,
            ),
        ),
    ]
