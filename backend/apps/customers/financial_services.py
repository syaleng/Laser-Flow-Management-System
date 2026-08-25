from decimal import Decimal

from django.db.models import Prefetch

from apps.design_orders.models import DesignOrder, DesignOrderPayment, DesignOrderStatus


def get_customer_statement(*, customer):
    orders = (
        DesignOrder.objects.filter(customer=customer)
        .exclude(status=DesignOrderStatus.CANCELLED)
        .prefetch_related(
            Prefetch(
                "payment_history",
                queryset=DesignOrderPayment.objects.select_related("recorded_by"),
            )
        )
        .order_by("-order_date", "-created_at")
    )
    total_amount = Decimal("0.00")
    total_paid = Decimal("0.00")
    for order in orders:
        order_paid = sum(
            (payment.amount for payment in order.payment_history.all()), Decimal("0.00")
        )
        order.statement_paid_amount = order_paid
        order.statement_remaining_amount = order.total_amount - order_paid
        total_amount += order.total_amount
        total_paid += order_paid

    payments = (
        DesignOrderPayment.objects.filter(design_order__customer=customer)
        .exclude(design_order__status=DesignOrderStatus.CANCELLED)
        .select_related("design_order", "recorded_by")
        .order_by("-created_at")
    )
    return {
        "orders": orders,
        "payments": payments,
        "total_orders": len(orders),
        "total_amount": total_amount,
        "total_paid": total_paid,
        "remaining_balance": total_amount - total_paid,
    }
