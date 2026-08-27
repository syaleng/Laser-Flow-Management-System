from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal
from rest_framework import serializers

from apps.accounting.services import get_customer_balance

from . import services
from .models import Customer
from .validators import normalize_whatsapp_number


class CustomerSerializer(serializers.ModelSerializer):
    current_debt = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = (
            "id",
            "customer_code",
            "full_name",
            "phone",
            "whatsapp_number",
            "whatsapp_consent",
            "whatsapp_consent_at",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
            "current_debt",
        )
        read_only_fields = (
            "id",
            "customer_code",
            "whatsapp_consent_at",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_current_debt(self, obj):
        return get_customer_balance(customer=obj)

    def validate_whatsapp_number(self, value):
        return normalize_whatsapp_number(value)

    def validate(self, attrs):
        consent = attrs.get(
            "whatsapp_consent",
            self.instance.whatsapp_consent if self.instance else False,
        )
        number = attrs.get(
            "whatsapp_number",
            self.instance.whatsapp_number if self.instance else "",
        )
        if consent and not number:
            raise serializers.ValidationError(
                {"whatsapp_number": "A WhatsApp number is required to record consent."}
            )
        return attrs

    def create(self, validated_data):
        try:
            return services.create_customer(data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

    def update(self, instance, validated_data):
        try:
            return services.update_customer(customer=instance, data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


class CustomerPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.01")
    )
    payment_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False, allow_blank=True, max_length=255)
