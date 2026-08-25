from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("daily_journal", "0005_moneyloan_purpose"),
    ]

    operations = [
        migrations.AddField(
            model_name="moneyloan",
            name="debt_type",
            field=models.CharField(
                choices=[
                    ("PERSONAL", "Personal loan"),
                    ("COMPANY_SUPPLIER", "Company or supplier"),
                    ("MACHINE_EQUIPMENT", "Machine or equipment"),
                    ("OTHER", "Other"),
                ],
                default="PERSONAL",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="payableaccount",
            name="debt_type",
            field=models.CharField(
                choices=[
                    ("PERSONAL", "Personal loan"),
                    ("COMPANY_SUPPLIER", "Company or supplier"),
                    ("MACHINE_EQUIPMENT", "Machine or equipment"),
                    ("OTHER", "Other"),
                ],
                default="PERSONAL",
                max_length=30,
            ),
        ),
    ]
