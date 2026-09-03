from django.db import migrations


def localize_descriptions(apps, schema_editor):
    LedgerEntry = apps.get_model("accounting", "CustomerLedgerEntry")
    for entry in LedgerEntry.objects.filter(description__startswith="Design order ").iterator():
        order_number = entry.description.removeprefix("Design order ")
        entry.description = f"د فرمایش حساب — {order_number}"
        entry.save(update_fields=["description"])
    for entry in LedgerEntry.objects.filter(description__startswith="Payment received for ").iterator():
        order_number = entry.description.removeprefix("Payment received for ")
        entry.description = f"د فرمایش تادیه — {order_number}"
        entry.save(update_fields=["description"])


class Migration(migrations.Migration):
    dependencies = [("accounting", "0001_initial")]
    operations = [migrations.RunPython(localize_descriptions, migrations.RunPython.noop)]
