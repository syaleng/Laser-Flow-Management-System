export interface Supplier {
  id: string;
  name: string;
  phone: string;
  description: string;
  is_active: boolean;
  total_payable: string;
  total_paid: string;
  remaining_balance: string;
  last_transaction_date: string | null;
}

export interface SupplierTransaction {
  id: string;
  transaction_date: string;
  type: "DEBIT" | "CREDIT";
  description: string;
  amount: string;
  balance: string;
}

export interface SupplierTransactions {
  supplier_name: string;
  total_payable: string;
  total_paid: string;
  remaining_balance: string;
  entries: SupplierTransaction[];
}
