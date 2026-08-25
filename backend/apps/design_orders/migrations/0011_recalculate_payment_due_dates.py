from datetime import timedelta

from django.conf import settings
from django.db import migrations


def recalculate_payment_due_dates(apps, schema_editor):
    DesignOrder = apps.get_model("design_orders", "DesignOrder")
    terms_days = settings.DEFAULT_PAYMENT_TERMS_DAYS
    orders = DesignOrder.objects.only("id", "order_date", "payment_due_date")
    to_update = []
    for order in orders.iterator():
        due_date = order.order_date + timedelta(days=terms_days)
        if order.payment_due_date != due_date:
            order.payment_due_date = due_date
            to_update.append(order)
    if to_update:
        DesignOrder.objects.bulk_update(to_update, ["payment_due_date"])


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0010_design_order_payment_history")]

    operations = [migrations.RunPython(recalculate_payment_due_dates, migrations.RunPython.noop)]
