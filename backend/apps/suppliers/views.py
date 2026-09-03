from django.db.models import Prefetch
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.authorization import Capability
from apps.accounts.permissions import HasRequiredCapability
from apps.daily_journal.models import JournalActivity

from . import services
from .models import Supplier, SupplierTransaction
from .serializers import (
    SupplierSerializer,
    SupplierTransactionInputSerializer,
    SupplierTransactionSerializer,
    VoidSupplierTransactionSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.prefetch_related(
        Prefetch("transactions", queryset=SupplierTransaction.objects.select_related("created_by"))
    )
    serializer_class = SupplierSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_EXPENSES
    http_method_names = ["get", "post", "patch", "head", "options"]

    def list(self, request, *args, **kwargs):
        return Response({"data": self.get_serializer(self.get_queryset(), many=True).data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        supplier = serializer.save()
        return Response(
            {"data": self.get_serializer(supplier).data}, status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"data": self.get_serializer(self.get_object()).data})

    def _create_transaction(self, request, supplier, transaction_type):
        serializer = SupplierTransactionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_transaction = (
            services.create_supplier_debit
            if transaction_type == SupplierTransaction.TransactionType.DEBIT
            else services.create_supplier_credit
        )
        supplier_transaction = create_transaction(
            supplier=supplier,
            amount=serializer.validated_data["amount"],
            description=serializer.validated_data["description"],
            transaction_date=serializer.validated_data.get(
                "transaction_date", timezone.localdate()
            ),
            created_by=request.user,
        )
        return Response(
            {
                "transaction": SupplierTransactionSerializer(supplier_transaction).data,
                "updated_supplier_balance": str(services.get_supplier_balance(supplier=supplier)),
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=SupplierTransactionInputSerializer)
    @action(detail=True, methods=["post"], url_path="transactions/debit")
    def debit(self, request, pk=None):
        return self._create_transaction(
            request, self.get_object(), SupplierTransaction.TransactionType.DEBIT
        )

    @extend_schema(request=SupplierTransactionInputSerializer)
    @action(detail=True, methods=["post"], url_path="transactions/credit")
    def credit(self, request, pk=None):
        return self._create_transaction(
            request, self.get_object(), SupplierTransaction.TransactionType.CREDIT
        )

    @extend_schema(responses={200: SupplierTransactionSerializer(many=True)})
    @action(detail=True, methods=["get"], url_path="transactions")
    def transactions(self, request, pk=None):
        supplier = self.get_object()
        entries = list(services.get_supplier_transactions(supplier=supplier))
        running = 0
        payload = []
        for entry in entries:
            running += entry.amount if entry.transaction_type == "DEBIT" else -entry.amount
            payload.append(
                {
                    "id": str(entry.id),
                    "transaction_date": entry.transaction_date.isoformat(),
                    "type": entry.transaction_type,
                    "description": entry.description,
                    "amount": str(entry.amount),
                    "balance": str(running),
                }
            )
        total_payable = sum((e.amount for e in entries if e.transaction_type == "DEBIT"), 0)
        total_paid = sum((e.amount for e in entries if e.transaction_type == "CREDIT"), 0)
        return Response(
            {
                "data": {
                    "supplier_name": supplier.name,
                    "total_payable": str(total_payable),
                    "total_paid": str(total_paid),
                    "remaining_balance": str(running),
                    "entries": payload,
                }
            }
        )

    @action(detail=True, methods=["post"], url_path=r"transactions/(?P<transaction_id>[^/.]+)/void")
    def void_transaction(self, request, pk=None, transaction_id=None):
        serializer = VoidSupplierTransactionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        supplier = self.get_object()
        entry = supplier.transactions.filter(pk=transaction_id).first()
        if entry is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("Transaction not found.")
        values = {
            "amount": str(entry.amount),
            "type": entry.transaction_type,
            "reason": serializer.validated_data["reason"],
        }
        entity_id = entry.id
        services.void_supplier_transaction(entry=entry)
        JournalActivity.objects.create(
            entity_type="supplier_transaction",
            entity_id=entity_id,
            action="voided",
            changed_fields=values,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = False
        supplier.save(update_fields=["is_active", "updated_at"])
        return Response({"data": self.get_serializer(supplier).data})

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        supplier = self.get_object()
        supplier.is_active = True
        supplier.save(update_fields=["is_active", "updated_at"])
        return Response({"data": self.get_serializer(supplier).data})
