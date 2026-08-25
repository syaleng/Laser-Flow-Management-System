from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0003_design_order_payment_status")]

    operations = [
        migrations.AddField(
            model_name="designorder",
            name="design_type",
            field=models.CharField(
                choices=[("JAR", "Jar"), ("SIMPLE", "Simple")], default="SIMPLE", max_length=10
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="designorder",
            name="color_count",
            field=models.CharField(
                choices=[("1", "1 color"), ("2", "2 colors")], default="1", max_length=1
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="designorder",
            name="gemstone_size",
            field=models.PositiveSmallIntegerField(default=6),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="designorder",
            name="baran_size_mm",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("1.00"),
                max_digits=7,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
            ),
            preserve_default=False,
        ),
    ]
