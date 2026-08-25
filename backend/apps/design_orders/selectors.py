from django.db.models import F, Q, QuerySet
from django.utils import timezone

from .models import DesignCategory, DesignOrder, DesignOrderStatus, PaymentStatus

ORDERING_FIELDS = {
    "created_at": "created_at",
    "-created_at": "-created_at",
    "design_name": "design_name",
    "-order_date": "-order_date",
    "customer_name": "customer__full_name",
    "status": "status",
    "total_amount": "total_amount",
    "-total_amount": "-total_amount",
    "expected_delivery_date": "expected_delivery_date",
    "-expected_delivery_date": "-expected_delivery_date",
}


def category_list(*, active_only=False) -> QuerySet[DesignCategory]:
    queryset = DesignCategory.objects.all()
    if active_only:
        queryset = queryset.filter(is_active=True)
    return queryset.order_by("name")


def design_order_list(*, filters: dict) -> QuerySet[DesignOrder]:
    queryset = DesignOrder.objects.select_related("customer", "design_category", "created_by")
    if search := filters.get("search"):
        queryset = queryset.filter(
            Q(order_number__icontains=search)
            | Q(design_name__icontains=search)
            | Q(customer__full_name__icontains=search)
            | Q(customer__customer_code__icontains=search)
        )
    if status := filters.get("status"):
        queryset = queryset.filter(status=status)
    if customer_id := filters.get("customer_id"):
        queryset = queryset.filter(customer_id=customer_id)
    if category_id := filters.get("category_id"):
        queryset = queryset.filter(design_category_id=category_id)
    if date_from := filters.get("order_date_from"):
        queryset = queryset.filter(order_date__gte=date_from)
    if date_to := filters.get("order_date_to"):
        queryset = queryset.filter(order_date__lte=date_to)
    payment_filter = filters.get("payment_filter")
    if payment_filter == "outstanding":
        queryset = queryset.filter(
            payment_status__in=(PaymentStatus.CREDIT, PaymentStatus.PARTIAL)
        ).exclude(status=DesignOrderStatus.CANCELLED)
    elif payment_filter == "partial":
        queryset = queryset.filter(payment_status=PaymentStatus.PARTIAL).exclude(
            status=DesignOrderStatus.CANCELLED
        )
    elif payment_filter == "credit":
        queryset = queryset.filter(payment_status=PaymentStatus.CREDIT).exclude(
            status=DesignOrderStatus.CANCELLED
        )
    elif payment_filter == "settled":
        queryset = queryset.filter(payment_status=PaymentStatus.FULLY_PAID)
    ordering = ORDERING_FIELDS.get(filters.get("ordering"), "-created_at")
    return queryset.order_by(ordering, "order_number")


def customer_design_orders(*, customer_id, limit=None) -> QuerySet[DesignOrder]:
    queryset = design_order_list(filters={}).filter(customer_id=customer_id)
    return queryset[:limit] if limit else queryset


def overdue_debt_orders() -> QuerySet[DesignOrder]:
    return (
        DesignOrder.objects.select_related("customer")
        .filter(
            payment_due_date__lte=timezone.localdate(),
            paid_amount__lt=F("total_amount"),
        )
        .exclude(status=DesignOrderStatus.CANCELLED)
        .order_by("payment_due_date", "order_number")
    )
