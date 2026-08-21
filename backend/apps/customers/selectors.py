from django.db.models import Q, QuerySet

from .models import Customer

ORDERING_FIELDS = {
    "full_name": "full_name",
    "-full_name": "-full_name",
    "created_at": "created_at",
    "-created_at": "-created_at",
    "customer_code": "customer_code",
    "-customer_code": "-customer_code",
}


def customer_list(*, params) -> QuerySet[Customer]:
    queryset = Customer.objects.all()

    if search := params.get("search", "").strip():
        queryset = queryset.filter(
            Q(full_name__icontains=search)
            | Q(customer_code__icontains=search)
            | Q(phone__icontains=search)
            | Q(whatsapp_number__icontains=search)
        )

    active = params.get("is_active")
    if active in {"true", "false"}:
        queryset = queryset.filter(is_active=active == "true")

    consent = params.get("whatsapp_consent")
    if consent in {"true", "false"}:
        queryset = queryset.filter(whatsapp_consent=consent == "true")

    ordering = ORDERING_FIELDS.get(params.get("ordering"), "full_name")
    return queryset.order_by(ordering, "customer_code")


def customer_get(*, customer_id) -> Customer:
    return Customer.objects.get(pk=customer_id)
