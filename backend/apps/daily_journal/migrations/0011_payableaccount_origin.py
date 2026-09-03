from django.db import migrations, models


def classify_existing_payables(apps, schema_editor):
    PayableAccount = apps.get_model("daily_journal", "PayableAccount")
    PayableAccount.objects.filter(debt_type="PERSONAL").update(origin="CASH_LOAN")


class Migration(migrations.Migration):
    dependencies = [("daily_journal", "0010_alter_expense_category")]

    operations = [
        migrations.AddField(
            model_name="dailyclosing",
            name="money_received",
            field=models.DecimalField(decimal_places=2, default="0.00", max_digits=14),
        ),
        migrations.AddField(
            model_name="payableaccount",
            name="origin",
            field=models.CharField(
                choices=[
                    ("CREDIT_PURCHASE", "Credit purchase (no cash received)"),
                    ("CASH_LOAN", "Money received as a loan"),
                ],
                db_index=True,
                default="CREDIT_PURCHASE",
                max_length=20,
            ),
        ),
        migrations.RunPython(classify_existing_payables, migrations.RunPython.noop),
    ]
