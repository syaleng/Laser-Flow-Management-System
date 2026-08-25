from decimal import Decimal

from rest_framework import serializers

from apps.accounting.models import CustomerLedgerEntry
from apps.design_orders.models import DesignOrderPayment


class CustomerLedgerEntrySerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source="posted_at", format="%Y-%m-%d")
    type = serializers.SerializerMethodField()
    description = serializers.CharField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance_after_transaction = serializers.SerializerMethodField()

    class Meta:
        model = CustomerLedgerEntry
        fields = (
            "date",
            "type",
            "description",
            "amount",
            "balance_after_transaction",
            "source_type",
            "source_id",
        )

    def get_type(self, obj):
        return "Order" if obj.entry_type == "DEBIT" else "Payment"

    def get_balance_after_transaction(self, obj):
        running_balance = Decimal("0.00")
        entries = CustomerLedgerEntry.objects.filter(customer=obj.customer).order_by("posted_at", "created_at")
        for entry in entries:
            value = entry.amount if entry.entry_type == "DEBIT" else -entry.amount
            running_balance += value
            if entry.id == obj.id:
                return running_balance
        return running_balance


class CustomerLedgerSerializer(serializers.Serializer):
    customer_name = serializers.CharField(source="full_name")
    total_orders_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    remaining_debt_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    entries = CustomerLedgerEntrySerializer(many=True)


class CustomerStatementOrderSerializer(serializers.Serializer):
    order_number = serializers.CharField()
    date = serializers.DateField(source="order_date")
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, source="statement_paid_amount"
    )
    remaining_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, source="statement_remaining_amount"
    )
    payment_status = serializers.CharField()


class CustomerStatementPaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="design_order.order_number")
    recorded_user = serializers.CharField(source="recorded_by.full_name")

    class Meta:
        model = DesignOrderPayment
        fields = ("payment_date", "amount", "order_number", "recorded_user", "note")


class CustomerStatementSerializer(serializers.Serializer):
    total_orders = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=14, decimal_places=2)
    remaining_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
    orders = CustomerStatementOrderSerializer(many=True)
    payments = CustomerStatementPaymentSerializer(many=True)
