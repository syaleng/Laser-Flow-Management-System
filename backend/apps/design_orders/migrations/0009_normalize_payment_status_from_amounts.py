from django.db import migrations
from django.db.models import F


def normalize_payment_statuses(apps, schema_editor):
    order_model = apps.get_model("design_orders", "DesignOrder")
    order_model.objects.filter(paid_amount=0).update(payment_status="CREDIT")
    order_model.objects.filter(
        paid_amount__gt=0,
        paid_amount__lt=F("total_amount"),
    ).update(payment_status="PARTIAL")
    order_model.objects.filter(paid_amount__gte=F("total_amount")).update(
        payment_status="FULLY_PAID"
    )


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0008_add_fully_paid_payment_status")]

    operations = [
        migrations.RunPython(normalize_payment_statuses, migrations.RunPython.noop),
    ]
