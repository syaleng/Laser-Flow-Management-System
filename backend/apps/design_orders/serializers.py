from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.customers.models import Customer

from . import services
from .models import (
    DesignCategory,
    DesignOrder,
    DesignOrderPayment,
    DesignOrderStatus,
    DesignOrderStatusHistory,
    PaymentStatus,
)


class DesignCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignCategory
        fields = ("id", "name", "description", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "is_active", "created_at", "updated_at")

    def create(self, validated_data):
        try:
            return services.create_category(data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

    def update(self, instance, validated_data):
        try:
            return services.update_category(category=instance, data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


class CustomerSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "customer_code", "full_name", "phone", "whatsapp_number")


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = DesignOrderStatusHistory
        fields = (
            "id",
            "from_status",
            "to_status",
            "note",
            "changed_by_name",
            "created_at",
        )


class DesignOrderPaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)

    class Meta:
        model = DesignOrderPayment
        fields = ("id", "amount", "payment_date", "note", "recorded_by_name", "created_at")


class PaymentListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="design_order.order_number", read_only=True)
    design_name = serializers.CharField(source="design_order.design_name", read_only=True)
    customer_name = serializers.CharField(source="design_order.customer.full_name", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)

    class Meta:
        model = DesignOrderPayment
        fields = (
            "id",
            "amount",
            "payment_date",
            "note",
            "recorded_by_name",
            "order_number",
            "design_name",
            "customer_name",
            "created_at",
        )


class RecordPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
    payment_date = serializers.DateField(required=False)


class DesignOrderSerializer(serializers.ModelSerializer):
    customer = CustomerSummarySerializer(read_only=True)
    design_category = DesignCategorySerializer(read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    payment_history = DesignOrderPaymentSerializer(many=True, read_only=True)
    remaining_amount = serializers.SerializerMethodField()

    @extend_schema_field(serializers.DecimalField(max_digits=14, decimal_places=2))
    def get_remaining_amount(self, obj):
        return obj.total_amount - obj.paid_amount

    class Meta:
        model = DesignOrder
        fields = (
            "id",
            "order_number",
            "customer",
            "design_category",
            "design_name",
            "design_description",
            "customer_reference_image",
            "design_preview_image",
            "design_file_reference",
            "design_file_name",
            "design_file_type",
            "cut_quantity",
            "unit_price",
            "total_amount",
            "order_date",
            "expected_delivery_date",
            "actual_delivery_date",
            "payment_due_date",
            "status",
            "payment_status",
            "paid_amount",
            "remaining_amount",
            "design_type",
            "color_count",
            "gemstone_size",
            "baran_size_mm",
            "notes",
            "created_by_name",
            "status_history",
            "payment_history",
            "created_at",
            "updated_at",
        )


class DesignOrderListSerializer(serializers.ModelSerializer):
    customer = CustomerSummarySerializer(read_only=True)
    design_category = DesignCategorySerializer(read_only=True)
    remaining_amount = serializers.SerializerMethodField()

    @extend_schema_field(serializers.DecimalField(max_digits=14, decimal_places=2))
    def get_remaining_amount(self, obj):
        return obj.total_amount - obj.paid_amount

    class Meta:
        model = DesignOrder
        fields = (
            "id",
            "order_number",
            "customer",
            "design_category",
            "design_name",
            "cut_quantity",
            "unit_price",
            "total_amount",
            "order_date",
            "expected_delivery_date",
            "actual_delivery_date",
            "status",
            "payment_status",
            "paid_amount",
            "remaining_amount",
            "design_type",
            "color_count",
            "gemstone_size",
            "baran_size_mm",
            "created_at",
        )


class DesignOrderWriteSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer", queryset=Customer.objects.all()
    )
    design_category_id = serializers.PrimaryKeyRelatedField(
        source="design_category",
        queryset=DesignCategory.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = DesignOrder
        fields = (
            "customer_id",
            "design_category_id",
            "design_name",
            "design_description",
            "cut_quantity",
            "unit_price",
            "payment_status",
            "paid_amount",
            "status",
            "design_type",
            "color_count",
            "gemstone_size",
            "baran_size_mm",
            "order_date",
            "expected_delivery_date",
            "notes",
        )

    def validate(self, attrs):
        requested_status = attrs.get("status")
        if self.instance and requested_status and requested_status != self.instance.status:
            raise serializers.ValidationError(
                {"status": "د فرمایش حالت یوازې د حالت د ځانګړو تڼیو له لارې بدلېدای شي."}
            )
        if not self.instance and requested_status not in {None, DesignOrderStatus.NEW}:
            raise serializers.ValidationError({"status": "نوی فرمایش باید د نوي حالت څخه پیل شي."})
        order_date = attrs.get("order_date", self.instance.order_date if self.instance else None)
        expected = attrs.get(
            "expected_delivery_date",
            self.instance.expected_delivery_date if self.instance else None,
        )
        if order_date and expected and expected < order_date:
            raise serializers.ValidationError(
                {"expected_delivery_date": "Delivery cannot be before the order date."}
            )
        quantity = attrs.get("cut_quantity", self.instance.cut_quantity if self.instance else 0)
        unit_price = attrs.get("unit_price", self.instance.unit_price if self.instance else 0)
        paid_amount = attrs.get("paid_amount", self.instance.paid_amount if self.instance else 0)
        total_amount = quantity * unit_price
        if paid_amount > total_amount:
            raise serializers.ValidationError(
                {"paid_amount": "Paid amount cannot exceed the total amount."}
            )
        payment_status = attrs.get(
            "payment_status", self.instance.payment_status if self.instance else None
        )
        if self.instance and paid_amount != self.instance.paid_amount:
            raise serializers.ValidationError(
                {"paid_amount": "نوې تادیه د «تادیه ثبتول» له لارې ثبت کړئ."}
            )
        if paid_amount == 0:
            expected_payment_status = PaymentStatus.CREDIT
        elif paid_amount == total_amount:
            expected_payment_status = PaymentStatus.FULLY_PAID
        else:
            expected_payment_status = PaymentStatus.PARTIAL
        if payment_status != expected_payment_status:
            if expected_payment_status == PaymentStatus.FULLY_PAID:
                message = "ټولې پیسې ترلاسه شوې دي، د تادیې حالت بدلول امکان نه لري."
            elif expected_payment_status == PaymentStatus.CREDIT:
                message = "پیسې نه دي ورکړل شوې، د تادیې حالت باید قرضه وي."
            else:
                message = "یوه برخه پیسې ورکړل شوې دي، د تادیې حالت باید نیمه ورکړه وي."
            raise serializers.ValidationError({"payment_status": message})
        return attrs

    def create(self, validated_data):
        try:
            return services.create_design_order(
                data=validated_data, created_by=self.context["request"].user
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

    def update(self, instance, validated_data):
        try:
            return services.update_design_order(order=instance, data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


class StatusTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=DesignOrderStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class DesignOrderFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=DesignOrderStatus.choices, required=False)
    customer_id = serializers.UUIDField(required=False)
    category_id = serializers.UUIDField(required=False)
    order_date_from = serializers.DateField(required=False)
    order_date_to = serializers.DateField(required=False)
    payment_filter = serializers.ChoiceField(
        choices=("outstanding", "partial", "credit", "settled"), required=False
    )
    ordering = serializers.ChoiceField(
        choices=(
            "created_at",
            "-created_at",
            "design_name",
            "-order_date",
            "customer_name",
            "status",
            "total_amount",
            "-total_amount",
            "expected_delivery_date",
            "-expected_delivery_date",
        ),
        required=False,
    )
