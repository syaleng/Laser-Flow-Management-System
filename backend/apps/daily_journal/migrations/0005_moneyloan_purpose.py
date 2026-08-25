from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("daily_journal", "0004_alter_expense_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="moneyloan",
            name="purpose",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
