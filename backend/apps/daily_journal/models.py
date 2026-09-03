from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import BaseModel


class ExpenseCategory(models.TextChoices):
    ELECTRICITY_WATER = "ELECTRICITY_WATER", "برېښنا او اوبه"
    RENT = "RENT", "کرایه"
    FOOD_STAFF = "FOOD_STAFF", "خوراک او د کارکوونکو ورځني لګښتونه"
    TRANSPORTATION = "TRANSPORTATION", "ترانسپورټ"
    MAINTENANCE = "MAINTENANCE", "ساتنه او ترمیم"
    MATERIALS = "MATERIALS", "مواد"
    DIAMONDS = "DIAMONDS", "د ډایانو اخیستل"
    OTHER = "OTHER", "نور لګښتونه"


class LoanStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    PARTIALLY_RETURNED = "PARTIALLY_RETURNED", "Partially returned"
    RETURNED = "RETURNED", "Returned"


class DebtType(models.TextChoices):
    PERSONAL = "PERSONAL", "Personal loan"
    COMPANY_SUPPLIER = "COMPANY_SUPPLIER", "Company or supplier"
    MACHINE_EQUIPMENT = "MACHINE_EQUIPMENT", "Machine or equipment"
    OTHER = "OTHER", "Other"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK = "BANK", "Bank"
    OTHER = "OTHER", "Other"


class PayableOrigin(models.TextChoices):
    CREDIT_PURCHASE = "CREDIT_PURCHASE", "Credit purchase (no cash received)"
    CASH_LOAN = "CASH_LOAN", "Money received as a loan"


class Expense(BaseModel):
    category = models.CharField(max_length=30, choices=ExpenseCategory.choices)
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    expense_date = models.DateField(db_index=True)
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_expenses"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_expenses"
    )

    class Meta:
        ordering = ["-expense_date", "-created_at"]
        indexes = [
            models.Index(fields=["expense_date", "category"], name="expense_date_category_idx")
        ]


class MoneyLoan(BaseModel):
    person_name = models.CharField(max_length=200)
    debt_type = models.CharField(max_length=30, choices=DebtType.choices, default=DebtType.PERSONAL)
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    returned_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    purpose = models.CharField(max_length=200, blank=True)
    loan_date = models.DateField(db_index=True)
    note = models.CharField(max_length=500, blank=True)
    status = models.CharField(
        max_length=25, choices=LoanStatus.choices, default=LoanStatus.OPEN, db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_money_loans"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_money_loans"
    )

    class Meta:
        ordering = ["-loan_date", "-created_at"]
        indexes = [models.Index(fields=["loan_date", "status"], name="loan_date_status_idx")]

    @property
    def remaining_balance(self):
        returned = self.repayments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")
        return self.amount - returned

    @property
    def total_returned(self):
        return self.repayments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")


class DailyClosing(BaseModel):
    closing_date = models.DateField(unique=True)
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    customer_payments = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    other_income = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    money_received = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    loan_returns = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    loan_given = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    payable_payments = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closing_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_income = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_expenses = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    net_profit = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="daily_closings"
    )

    class Meta:
        ordering = ["-closing_date"]


class JournalActivity(BaseModel):
    entity_type = models.CharField(max_length=30)
    entity_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=20)
    changed_fields = models.JSONField(default=dict)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="daily_journal_activities"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "-created_at"], name="journal_activity_time_idx")
        ]


class CashReconciliation(BaseModel):
    reconciliation_date = models.DateField(db_index=True)
    system_balance = models.DecimalField(max_digits=14, decimal_places=2)
    actual_balance = models.DecimalField(max_digits=14, decimal_places=2)
    difference = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.CharField(max_length=500)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="cash_reconciliations",
    )

    class Meta:
        ordering = ["-reconciliation_date", "-created_at"]
        indexes = [
            models.Index(
                fields=["reconciliation_date", "-created_at"],
                name="cash_reconcile_date_idx",
            )
        ]


class PayableAccount(BaseModel):
    person_name = models.CharField(max_length=200)
    debt_type = models.CharField(max_length=30, choices=DebtType.choices, default=DebtType.PERSONAL)
    origin = models.CharField(
        max_length=20,
        choices=PayableOrigin.choices,
        default=PayableOrigin.CREDIT_PURCHASE,
        db_index=True,
    )
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    payable_date = models.DateField(db_index=True)
    purpose = models.CharField(max_length=200)
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_payables"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_payables"
    )

    class Meta:
        ordering = ["-payable_date", "-created_at"]

    @property
    def remaining_balance(self):
        paid = self.repayments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")
        return self.amount - paid

    @property
    def total_paid(self):
        return self.repayments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")

    @property
    def status(self):
        paid = self.total_paid
        if paid >= self.amount:
            return "PAID"
        return "PARTIAL" if paid > 0 else "OPEN"


class MoneyLoanRepayment(BaseModel):
    money_loan = models.ForeignKey(MoneyLoan, on_delete=models.PROTECT, related_name="repayments")
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    payment_date = models.DateField(db_index=True)
    payment_method = models.CharField(
        max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_loan_repayments"
    )

    class Meta:
        ordering = ["-payment_date", "-created_at"]


class PayableRepayment(BaseModel):
    payable_account = models.ForeignKey(
        PayableAccount, on_delete=models.PROTECT, related_name="repayments"
    )
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    payment_date = models.DateField(db_index=True)
    payment_method = models.CharField(
        max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_payable_repayments",
    )

    class Meta:
        ordering = ["-payment_date", "-created_at"]
