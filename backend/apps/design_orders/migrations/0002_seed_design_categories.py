from django.db import migrations

INITIAL_CATEGORIES = (
    "Women's shirt decoration",
    "Scarf/Tukri decoration",
    "Collar pattern",
    "Sleeve pattern",
    "Decorative pieces",
    "Custom design",
)


def seed_categories(apps, schema_editor):
    category_model = apps.get_model("design_orders", "DesignCategory")
    category_model.objects.bulk_create(
        [category_model(name=name) for name in INITIAL_CATEGORIES],
        ignore_conflicts=True,
    )


def remove_seeded_categories(apps, schema_editor):
    category_model = apps.get_model("design_orders", "DesignCategory")
    category_model.objects.filter(name__in=INITIAL_CATEGORIES).delete()


class Migration(migrations.Migration):
    dependencies = [("design_orders", "0001_initial")]

    operations = [migrations.RunPython(seed_categories, remove_seeded_categories)]
