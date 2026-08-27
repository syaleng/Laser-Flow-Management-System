from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("daily_journal", "0009_dailyclosing_closing_balance_and_more")]

    operations = [
        migrations.AlterField(
            model_name="expense",
            name="category",
            field=models.CharField(
                choices=[
                    ("ELECTRICITY_WATER", "برېښنا او اوبه"),
                    ("RENT", "کرایه"),
                    ("FOOD_STAFF", "خوراک او د کارکوونکو ورځني لګښتونه"),
                    ("TRANSPORTATION", "ترانسپورټ"),
                    ("MAINTENANCE", "ساتنه او ترمیم"),
                    ("MATERIALS", "مواد"),
                    ("DIAMONDS", "د ډایانو اخیستل"),
                    ("OTHER", "نور لګښتونه"),
                ],
                max_length=30,
            ),
        )
    ]
