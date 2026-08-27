from django.db import migrations


def reconcile_supplier_schema(apps, schema_editor):
    connection = schema_editor.connection
    quote = schema_editor.quote_name

    with connection.cursor() as cursor:
        supplier_columns = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, "suppliers_supplier"
            )
        }
        transaction_columns = {
            column.name
            for column in connection.introspection.get_table_description(
                cursor, "suppliers_suppliertransaction"
            )
        }

    if "date" in transaction_columns and "transaction_date" not in transaction_columns:
        schema_editor.execute(
            f"ALTER TABLE {quote('suppliers_suppliertransaction')} "
            f"RENAME COLUMN {quote('date')} TO {quote('transaction_date')}"
        )

    if "is_active" not in supplier_columns:
        Supplier = apps.get_model("suppliers", "Supplier")
        schema_editor.add_field(Supplier, Supplier._meta.get_field("is_active"))


class Migration(migrations.Migration):
    dependencies = [("suppliers", "0001_initial")]

    operations = [migrations.RunPython(reconcile_supplier_schema, migrations.RunPython.noop)]
