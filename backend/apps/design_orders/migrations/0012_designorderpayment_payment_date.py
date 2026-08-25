from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):
    dependencies = [
        ("design_orders", "0011_recalculate_payment_due_dates"),
    ]

    operations = [
        migrations.AddField(
            model_name="designorderpayment",
            name="payment_date",
            field=models.DateField(db_index=True, default=timezone.localdate),
        ),
    ]
