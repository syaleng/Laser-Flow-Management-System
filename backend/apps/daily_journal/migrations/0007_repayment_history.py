import uuid
from decimal import Decimal

import django.core.validators
from django.conf import settings
from django.db import migrations, models


def migrate_legacy_balances(apps, schema_editor):
    MoneyLoan = apps.get_model("daily_journal", "MoneyLoan")
    LoanRepayment = apps.get_model("daily_journal", "MoneyLoanRepayment")
    Payable = apps.get_model("daily_journal", "PayableAccount")
    PayableRepayment = apps.get_model("daily_journal", "PayableRepayment")
    for loan in MoneyLoan.objects.exclude(returned_amount=0):
        LoanRepayment.objects.create(
            money_loan_id=loan.id,
            amount=loan.returned_amount,
            payment_date=loan.loan_date,
            created_by_id=loan.updated_by_id,
        )
    for payable in Payable.objects.exclude(paid_amount=0):
        PayableRepayment.objects.create(
            payable_account_id=payable.id,
            amount=payable.paid_amount,
            payment_date=payable.payable_date,
            created_by_id=payable.updated_by_id,
        )
    MoneyLoan.objects.update(returned_amount=Decimal("0.00"))
    Payable.objects.update(paid_amount=Decimal("0.00"))


class Migration(migrations.Migration):
    dependencies = [("daily_journal", "0006_debt_types")]
    operations = [
        migrations.CreateModel(
            name="MoneyLoanRepayment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=14,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                ("payment_date", models.DateField(db_index=True)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[("CASH", "Cash"), ("BANK", "Bank"), ("OTHER", "Other")],
                        default="CASH",
                        max_length=10,
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=500)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="created_loan_repayments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "money_loan",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="repayments",
                        to="daily_journal.moneyloan",
                    ),
                ),
            ],
            options={"ordering": ["-payment_date", "-created_at"]},
        ),
        migrations.CreateModel(
            name="PayableRepayment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=14,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                ("payment_date", models.DateField(db_index=True)),
                (
                    "payment_method",
                    models.CharField(
                        choices=[("CASH", "Cash"), ("BANK", "Bank"), ("OTHER", "Other")],
                        default="CASH",
                        max_length=10,
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=500)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="created_payable_repayments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "payable_account",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="repayments",
                        to="daily_journal.payableaccount",
                    ),
                ),
            ],
            options={"ordering": ["-payment_date", "-created_at"]},
        ),
        migrations.RunPython(migrate_legacy_balances, migrations.RunPython.noop),
    ]
