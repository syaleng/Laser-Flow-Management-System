export interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_consent: boolean;
  whatsapp_consent_at: string | null;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  full_name: string;
  phone: string;
  whatsapp_number: string;
  whatsapp_consent: boolean;
  address: string;
  notes: string;
}

export interface CustomerListParams {
  search?: string;
  is_active?: "true" | "false" | "";
  whatsapp_consent?: "true" | "false" | "";
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PageMeta {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface CustomerPage {
  data: Customer[];
  meta: PageMeta;
}

export interface CustomerStatementOrder {
  order_number: string;
  date: string;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  payment_status: "CASH" | "PARTIAL" | "CREDIT" | "FULLY_PAID";
}

export interface CustomerStatementPayment {
  payment_date: string;
  amount: string;
  order_number: string;
  recorded_user: string;
  note: string;
}

export interface CustomerStatement {
  total_orders: number;
  total_amount: string;
  total_paid: string;
  remaining_balance: string;
  orders: CustomerStatementOrder[];
  payments: CustomerStatementPayment[];
}

export interface CustomerLedgerEntry {
  date: string;
  type: "Order" | "Payment";
  description: string;
  amount: string;
  balance_after_transaction: string;
  source_type: string;
  source_id: string;
}

export interface CustomerLedger {
  customer_name: string;
  total_orders_amount: string;
  total_paid_amount: string;
  remaining_debt_balance: string;
  entries: CustomerLedgerEntry[];
}

