from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0007_optional_design_title")]

    operations = [
        migrations.AlterField(
            model_name="designorder",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("CASH", "Cash"),
                    ("PARTIAL", "Partially paid"),
                    ("CREDIT", "Credit"),
                    ("FULLY_PAID", "Fully paid"),
                ],
                db_index=True,
                default="CREDIT",
                max_length=20,
            ),
        ),
    ]
