from urllib.parse import quote

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.authorization import Capability
from apps.accounts.models import UserRole
from apps.accounts.permissions import HasRequiredCapability

from . import selectors, services
from .models import DesignOrderPayment
from .serializers import (
    DesignCategorySerializer,
    DesignOrderFilterSerializer,
    DesignOrderListSerializer,
    DesignOrderPaymentSerializer,
    DesignOrderSerializer,
    DesignOrderWriteSerializer,
    PaymentListSerializer,
    RecordPaymentSerializer,
    StatusHistorySerializer,
    StatusTransitionSerializer,
)


class DesignCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = DesignCategorySerializer
    permission_classes = [HasRequiredCapability]
    http_method_names = ["get", "post", "patch", "head", "options"]

    @property
    def required_capability(self):
        if self.request.method in {"GET", "HEAD", "OPTIONS"}:
            return Capability.MANAGE_DESIGN_ORDERS
        return Capability.MANAGE_DESIGN_CATEGORIES

    def get_queryset(self):
        return selectors.category_list(
            active_only=self.request.query_params.get("is_active") == "true"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(
            {"data": self.get_serializer(category).data}, status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"data": self.get_serializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        category = self.get_object()
        serializer = self.get_serializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response({"data": self.get_serializer(serializer.save()).data})

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        category = services.update_category(category=self.get_object(), data={"is_active": False})
        return Response({"data": self.get_serializer(category).data})

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        category = services.update_category(category=self.get_object(), data={"is_active": True})
        return Response({"data": self.get_serializer(category).data})


class DesignOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [HasRequiredCapability]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "head", "options"]
    required_capability = Capability.MANAGE_DESIGN_ORDERS

    def get_queryset(self):
        filters = DesignOrderFilterSerializer(data=self.request.query_params)
        filters.is_valid(raise_exception=True)
        queryset = selectors.design_order_list(filters=filters.validated_data)
        if self.action in {"retrieve", "history", "transition_status", "record_payment"}:
            return queryset.prefetch_related(
                "status_history__changed_by", "payment_history__recorded_by"
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return DesignOrderListSerializer
        if self.action in {"create", "partial_update"}:
            return DesignOrderWriteSerializer
        return DesignOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            {"data": DesignOrderSerializer(order, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response(
            {"data": DesignOrderSerializer(self.get_object(), context={"request": request}).data}
        )

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = self.get_serializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response({"data": DesignOrderSerializer(order, context={"request": request}).data})

    @extend_schema(
        request=StatusTransitionSerializer,
        responses={200: DesignOrderSerializer},
    )
    @action(detail=True, methods=["post"], url_path="status")
    def transition_status(self, request, pk=None):
        serializer = StatusTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = services.transition_design_order(
                order=self.get_object(),
                target_status=serializer.validated_data["status"],
                changed_by=request.user,
                note=serializer.validated_data.get("note", ""),
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        return Response({"data": DesignOrderSerializer(order, context={"request": request}).data})

    @extend_schema(responses={200: StatusHistorySerializer(many=True)})
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        history = self.get_object().status_history.select_related("changed_by")
        return Response({"data": StatusHistorySerializer(history, many=True).data})

    @extend_schema(request=RecordPaymentSerializer, responses={201: DesignOrderSerializer})
    @action(detail=True, methods=["post"], url_path="payments")
    def record_payment(self, request, pk=None):
        serializer = RecordPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order, payment = services.record_design_order_payment(
                order=self.get_object(),
                amount=serializer.validated_data["amount"],
                recorded_by=request.user,
                note=serializer.validated_data.get("note", ""),
                payment_date=serializer.validated_data.get("payment_date"),
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        return Response(
            {
                "data": DesignOrderSerializer(order, context={"request": request}).data,
                "payment": DesignOrderPaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="overdue-reminders")
    def overdue_reminders(self, request):
        if not request.user.is_superuser and request.user.role not in {
            UserRole.OWNER,
            UserRole.MANAGER,
        }:
            raise PermissionDenied("د پورونو خبرتیاوې یوازې مدیر ته ښکاري.")

        reminders = []
        for order in selectors.overdue_debt_orders():
            remaining = order.total_amount - order.paid_amount
            customer = order.customer
            message = (
                f"قدرمن {customer.full_name}، هیله ده روغ او جوړ یاست. "
                f"ستاسو د فرمایش {order.order_number} له حساب څخه "
                f"{remaining:,.2f} افغانۍ پاتې دي. مهرباني وکړئ په مناسب وخت کې "
                "پاتې حساب تصفیه کړئ. مننه، د لیزر ډیزاین مرکز."
            )
            whatsapp_url = None
            if customer.whatsapp_consent and customer.whatsapp_number:
                phone = customer.whatsapp_number.lstrip("+")
                whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"
            reminders.append(
                {
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "customer_name": customer.full_name,
                    "remaining_amount": str(remaining),
                    "payment_due_date": order.payment_due_date,
                    "whatsapp_allowed": bool(
                        customer.whatsapp_consent and customer.whatsapp_number
                    ),
                    "whatsapp_url": whatsapp_url,
                    "message": message,
                }
            )
        return Response({"data": reminders, "count": len(reminders)})


class PaymentListView(ListAPIView):
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_PAYMENTS
    serializer_class = PaymentListSerializer

    def get_queryset(self):
        queryset = DesignOrderPayment.objects.select_related(
            "design_order", "design_order__customer", "recorded_by"
        )
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(design_order__order_number__icontains=search)
                | Q(design_order__design_name__icontains=search)
                | Q(design_order__customer__full_name__icontains=search)
            )
        return queryset
