from decimal import Decimal

from rest_framework import serializers

from . import services
from .models import Supplier, SupplierTransaction


class SupplierTransactionSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="transaction_type", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = SupplierTransaction
        fields = (
            "id",
            "type",
            "transaction_type",
            "amount",
            "description",
            "transaction_date",
            "created_by_name",
            "created_at",
        )
        read_only_fields = ("id", "type", "transaction_type", "created_by_name", "created_at")


class SupplierSerializer(serializers.ModelSerializer):
    total_payable = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    last_transaction_date = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = (
            "id",
            "name",
            "phone",
            "description",
            "is_active",
            "total_payable",
            "total_paid",
            "remaining_balance",
            "last_transaction_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "total_payable",
            "total_paid",
            "remaining_balance",
            "last_transaction_date",
            "created_at",
            "updated_at",
        )

    def _totals(self, obj):
        debit = sum(
            (item.amount for item in obj.transactions.all() if item.transaction_type == "DEBIT"),
            Decimal("0.00"),
        )
        credit = sum(
            (item.amount for item in obj.transactions.all() if item.transaction_type == "CREDIT"),
            Decimal("0.00"),
        )
        return debit, credit

    def get_total_payable(self, obj):
        return self._totals(obj)[0]

    def get_total_paid(self, obj):
        return self._totals(obj)[1]

    def get_remaining_balance(self, obj):
        debit, credit = self._totals(obj)
        return debit - credit

    def get_last_transaction_date(self, obj):
        return max((item.transaction_date for item in obj.transactions.all()), default=None)

    def create(self, validated_data):
        return services.create_supplier(data=validated_data)


class SupplierTransactionInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    description = serializers.CharField(max_length=255, allow_blank=False)
    transaction_date = serializers.DateField(required=False)
