from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.design_orders.models import DesignOrderStatus, PaymentStatus


class ReportFilterSerializer(serializers.Serializer):
    period = serializers.ChoiceField(
        choices=("daily", "weekly", "monthly", "yearly", "custom"), default="monthly"
    )
    date = serializers.DateField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    customer_id = serializers.UUIDField(required=False)
    status = serializers.ChoiceField(choices=DesignOrderStatus.choices, required=False)
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices, required=False)

    def validate(self, attrs):
        selected = attrs.get("date", timezone.localdate())
        period = attrs["period"]
        if period == "daily":
            start = end = selected
        elif period == "weekly":
            start, end = selected - timedelta(days=selected.weekday()), selected
        elif period == "monthly":
            start, end = selected.replace(day=1), selected
        elif period == "yearly":
            start, end = selected.replace(month=1, day=1), selected
        else:
            start, end = attrs.get("start_date"), attrs.get("end_date")
            if not start or not end:
                raise serializers.ValidationError(
                    {"date_range": "start_date and end_date are required for a custom range."}
                )
        if start > end:
            raise serializers.ValidationError(
                {"date_range": "start_date cannot be after end_date."}
            )
        attrs["start_date"], attrs["end_date"] = start, end
        return attrs
