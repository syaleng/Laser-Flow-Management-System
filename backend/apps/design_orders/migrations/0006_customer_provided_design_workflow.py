import django.db.models.deletion
from django.db import migrations, models


def normalize_payment_statuses(apps, schema_editor):
    order_model = apps.get_model("design_orders", "DesignOrder")
    order_model.objects.filter(payment_status="FULLY_PAID").update(payment_status="CASH")
    order_model.objects.filter(payment_status="UNPAID").update(payment_status="CREDIT")


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0005_design_order_payment_accounting")]

    operations = [
        migrations.RunPython(normalize_payment_statuses, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="designorder",
            name="payment_status",
            field=models.CharField(
                choices=[("CASH", "Cash"), ("PARTIAL", "Partially paid"), ("CREDIT", "Credit")],
                db_index=True,
                default="CREDIT",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="designorder",
            name="design_category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="design_orders",
                to="design_orders.designcategory",
            ),
        ),
    ]
