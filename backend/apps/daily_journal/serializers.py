from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import (
    CashReconciliation,
    DailyClosing,
    Expense,
    ExpenseCategory,
    JournalActivity,
    MoneyLoan,
    PayableAccount,
    PaymentMethod,
)


class ExpenseSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "category",
            "category_label",
            "amount",
            "expense_date",
            "note",
            "created_by_name",
            "updated_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by_name", "updated_by_name", "created_at", "updated_at")

    def validate_category(self, value):
        if value not in ExpenseCategory.values:
            raise serializers.ValidationError("Select a valid expense category.")
        return value


class MoneyLoanSerializer(serializers.ModelSerializer):
    returned_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    remaining_balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True)
    repayments = serializers.SerializerMethodField()

    class Meta:
        model = MoneyLoan
        fields = (
            "id",
            "person_name",
            "debt_type",
            "amount",
            "returned_amount",
            "remaining_balance",
            "purpose",
            "loan_date",
            "note",
            "status",
            "repayments",
            "created_by_name",
            "updated_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "remaining_balance",
            "status",
            "created_by_name",
            "updated_at",
            "created_at",
        )

    def validate(self, attrs):
        if self.instance and "returned_amount" in attrs:
            raise serializers.ValidationError(
                {"returned_amount": "Use the repayment action to record a return."}
            )
        if not self.instance and attrs.get("returned_amount", Decimal("0.00")) > attrs.get(
            "amount", Decimal("0.00")
        ):
            raise serializers.ValidationError(
                {"returned_amount": "Returned amount cannot exceed the loan amount."}
            )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["returned_amount"] = str(instance.total_returned)
        data["remaining_balance"] = str(instance.remaining_balance)
        return data

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_repayments(self, instance):
        return RepaymentHistorySerializer(
            instance.repayments.select_related("created_by"), many=True
        ).data


class DailyClosingSerializer(serializers.ModelSerializer):
    closed_by_name = serializers.CharField(source="closed_by.full_name", read_only=True)

    class Meta:
        model = DailyClosing
        fields = (
            "id",
            "closing_date",
            "opening_balance",
            "customer_payments",
            "other_income",
            "money_received",
            "loan_returns",
            "loan_given",
            "payable_payments",
            "closing_balance",
            "total_income",
            "total_expenses",
            "net_profit",
            "closed_by_name",
            "created_at",
        )
        read_only_fields = (
            "opening_balance",
            "customer_payments",
            "other_income",
            "money_received",
            "loan_returns",
            "loan_given",
            "payable_payments",
            "closing_balance",
            "total_income",
            "total_expenses",
            "net_profit",
            "closed_by_name",
            "created_at",
        )


class JournalActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = JournalActivity
        fields = (
            "id",
            "entity_type",
            "entity_id",
            "action",
            "changed_fields",
            "actor_name",
            "created_at",
        )


class PayableAccountSerializer(serializers.ModelSerializer):
    paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)
    remaining_balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True)
    repayments = serializers.SerializerMethodField()

    class Meta:
        model = PayableAccount
        fields = (
            "id",
            "person_name",
            "debt_type",
            "origin",
            "amount",
            "paid_amount",
            "remaining_balance",
            "status",
            "repayments",
            "payable_date",
            "purpose",
            "note",
            "created_by_name",
            "updated_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "remaining_balance",
            "status",
            "created_by_name",
            "updated_by_name",
            "updated_at",
            "created_at",
        )

    def validate(self, attrs):
        if self.instance and "paid_amount" in attrs:
            raise serializers.ValidationError(
                {"paid_amount": "Use the repayment action to record a payment."}
            )
        if not self.instance and attrs.get("paid_amount", Decimal("0.00")) > attrs.get(
            "amount", Decimal("0.00")
        ):
            raise serializers.ValidationError(
                {"paid_amount": "Paid amount cannot exceed the payable amount."}
            )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["paid_amount"] = str(instance.total_paid)
        data["remaining_balance"] = str(instance.remaining_balance)
        data["status"] = instance.status
        return data

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_repayments(self, instance):
        return RepaymentHistorySerializer(
            instance.repayments.select_related("created_by"), many=True
        ).data


class RepaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class VoidReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=500)


class CashReconciliationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = CashReconciliation
        fields = (
            "id",
            "reconciliation_date",
            "system_balance",
            "actual_balance",
            "difference",
            "reason",
            "created_by_name",
            "created_at",
        )
        read_only_fields = (
            "system_balance",
            "difference",
            "created_by_name",
            "created_at",
        )

    def validate_actual_balance(self, value):
        if value < Decimal("0.00"):
            raise serializers.ValidationError("Actual cash cannot be negative.")
        return value

    def validate_reason(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("A clear reason is required.")
        return value.strip()


class RepaymentHistorySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    payment_date = serializers.DateField()
    payment_method = serializers.CharField()
    note = serializers.CharField()
    created_by_name = serializers.CharField(source="created_by.full_name")
    created_at = serializers.DateTimeField()
