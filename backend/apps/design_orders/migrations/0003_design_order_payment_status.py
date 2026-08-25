from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0002_seed_design_categories")]

    operations = [
        migrations.AddField(
            model_name="designorder",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("PAID_CASH", "Paid in cash"),
                    ("PARTIAL", "Partially paid"),
                    ("CREDIT", "Credit"),
                    ("UNPAID", "Fully outstanding"),
                ],
                db_index=True,
                default="UNPAID",
                max_length=20,
            ),
        ),
    ]
