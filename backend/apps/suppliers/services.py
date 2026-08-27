from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum
from rest_framework.exceptions import ValidationError

from .models import Supplier, SupplierTransaction


@transaction.atomic
def create_supplier(*, data: dict) -> Supplier:
    supplier = Supplier(**data)
    supplier.full_clean()
    supplier.save()
    return supplier


def _create_supplier_transaction(
    *,
    supplier: Supplier,
    transaction_type: str,
    amount,
    description: str,
    transaction_date,
    created_by,
) -> SupplierTransaction:
    entry = SupplierTransaction(
        supplier=supplier,
        transaction_type=transaction_type,
        amount=Decimal(str(amount)),
        description=description,
        transaction_date=transaction_date,
        created_by=created_by,
    )
    entry.full_clean()
    entry.save()
    return entry


@transaction.atomic
def create_supplier_debit(**kwargs) -> SupplierTransaction:
    return _create_supplier_transaction(
        transaction_type=SupplierTransaction.TransactionType.DEBIT, **kwargs
    )


@transaction.atomic
def create_supplier_credit(**kwargs) -> SupplierTransaction:
    supplier = Supplier.objects.select_for_update().get(pk=kwargs["supplier"].pk)
    if Decimal(str(kwargs["amount"])) > get_supplier_balance(supplier=supplier):
        raise ValidationError(
            {"amount": "Payment cannot exceed the amount still owed to the supplier."}
        )
    kwargs["supplier"] = supplier
    return _create_supplier_transaction(
        transaction_type=SupplierTransaction.TransactionType.CREDIT, **kwargs
    )


def get_supplier_balance(*, supplier: Supplier) -> Decimal:
    totals = supplier.transactions.aggregate(
        debit=Sum(
            "amount",
            filter=Q(transaction_type=SupplierTransaction.TransactionType.DEBIT),
        ),
        credit=Sum(
            "amount",
            filter=Q(transaction_type=SupplierTransaction.TransactionType.CREDIT),
        ),
    )
    return (totals["debit"] or Decimal("0.00")) - (totals["credit"] or Decimal("0.00"))


def get_supplier_transactions(*, supplier: Supplier):
    return supplier.transactions.select_related("created_by").order_by(
        "transaction_date", "created_at"
    )
