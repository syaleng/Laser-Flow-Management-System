from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from . import services
from .models import Customer
from .validators import normalize_whatsapp_number


class CustomerSerializer(serializers.ModelSerializer):
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
        )
        read_only_fields = (
            "id",
            "customer_code",
            "whatsapp_consent_at",
            "is_active",
            "created_at",
            "updated_at",
        )

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
