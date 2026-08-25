from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0006_customer_provided_design_workflow")]

    operations = [
        migrations.AlterField(
            model_name="designorder",
            name="design_name",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
