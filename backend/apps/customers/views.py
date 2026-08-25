from decimal import Decimal

from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.authorization import Capability
from apps.accounts.permissions import HasRequiredCapability
from apps.accounting.models import CustomerLedgerEntry, EntryType
from apps.accounting.services import get_customer_balance, get_customer_ledger

from . import selectors, services
from .financial_services import get_customer_statement
from .serializers import CustomerSerializer
from .statement_serializers import CustomerLedgerSerializer, CustomerStatementSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_CUSTOMERS
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return selectors.customer_list(params=self.request.query_params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            {"data": self.get_serializer(customer).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"data": self.get_serializer(self.get_object()).data})

    @extend_schema(responses={200: CustomerStatementSerializer})
    @action(detail=True, methods=["get"], url_path="statement")
    def statement(self, request, pk=None):
        statement = get_customer_statement(customer=self.get_object())
        data = CustomerStatementSerializer(statement).data
        return Response({"data": data})

    @extend_schema(responses={200: CustomerLedgerSerializer})
    @action(detail=True, methods=["get"], url_path="ledger")
    def ledger(self, request, pk=None):
        customer = self.get_object()
        entries = list(get_customer_ledger(customer=customer))
        running_balance = Decimal("0.00")
        serialized_entries = []
        for entry in entries:
            if hasattr(entry.posted_at, "date"):
                entry_date = entry.posted_at.date().isoformat()
            else:
                entry_date = entry.posted_at.isoformat()
            value = entry.amount if entry.entry_type == EntryType.DEBIT else -entry.amount
            running_balance += value
            serialized_entries.append(
                {
                    "date": entry_date,
                    "type": "Order" if entry.entry_type == EntryType.DEBIT else "Payment",
                    "description": entry.description or (
                        "Design order" if entry.entry_type == EntryType.DEBIT else "Payment"
                    ),
                    "amount": str(entry.amount if entry.entry_type == EntryType.DEBIT else -entry.amount),
                    "balance_after_transaction": str(running_balance),
                    "source_type": entry.source_type,
                    "source_id": entry.source_id,
                }
            )

        total_orders_amount = sum(
            (Decimal(entry["amount"]) for entry in serialized_entries if entry["type"] == "Order"),
            Decimal("0.00"),
        )
        total_paid_amount = sum(
            (Decimal(entry["amount"]) for entry in serialized_entries if entry["type"] == "Payment"),
            Decimal("0.00"),
        )
        ledger_payload = {
            "customer_name": customer.full_name,
            "total_orders_amount": str(abs(total_orders_amount)),
            "total_paid_amount": str(abs(total_paid_amount)),
            "remaining_debt_balance": str(get_customer_balance(customer=customer)),
            "entries": serialized_entries,
        }
        return Response({"data": ledger_payload})

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        serializer = self.get_serializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response({"data": self.get_serializer(customer).data})

    @extend_schema(request=None, responses={200: CustomerSerializer})
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        customer = services.archive_customer(customer=self.get_object())
        return Response({"data": self.get_serializer(customer).data})

    @extend_schema(request=None, responses={200: CustomerSerializer})
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        customer = services.restore_customer(customer=self.get_object())
        return Response({"data": self.get_serializer(customer).data})
