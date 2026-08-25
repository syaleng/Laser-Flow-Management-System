from decimal import Decimal

from django.test import TestCase

from apps.accounts.models import User
from apps.accounting.models import CustomerLedgerEntry, EntryType
from apps.accounting.services import create_ledger_entry, get_customer_balance, get_customer_ledger
from apps.customers.models import Customer


class CustomerLedgerEntryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ledger-user@example.com",
            password="Strong-Test-Password-123!",
            full_name="Ledger User",
        )
        self.customer = Customer.objects.create(full_name="Test Customer")

    def test_debit_increases_balance(self):
        create_ledger_entry(
            customer=self.customer,
            entry_type=EntryType.DEBIT,
            amount="150.00",
            description="Order created",
            created_by=self.user,
        )

        assert get_customer_balance(customer=self.customer) == Decimal("150.00")
        assert CustomerLedgerEntry.objects.filter(customer=self.customer).count() == 1

    def test_credit_decreases_balance(self):
        create_ledger_entry(
            customer=self.customer,
            entry_type=EntryType.DEBIT,
            amount="200.00",
            description="Initial order",
            created_by=self.user,
        )
        create_ledger_entry(
            customer=self.customer,
            entry_type=EntryType.CREDIT,
            amount="50.00",
            description="Payment received",
            created_by=self.user,
        )

        assert get_customer_balance(customer=self.customer) == Decimal("150.00")

    def test_customer_ledger_history_works(self):
        create_ledger_entry(
            customer=self.customer,
            entry_type=EntryType.DEBIT,
            amount="100.00",
            description="Order 1",
            created_by=self.user,
        )
        create_ledger_entry(
            customer=self.customer,
            entry_type=EntryType.CREDIT,
            amount="30.00",
            description="Payment 1",
            created_by=self.user,
        )

        ledger = list(get_customer_ledger(customer=self.customer, limit=10))
        assert len(ledger) == 2
        assert [entry.description for entry in ledger] == ["Payment 1", "Order 1"]
