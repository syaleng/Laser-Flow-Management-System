import type { DesignOrderStatus, PaymentStatus } from "@/features/design-orders/types";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";
export interface ReportFilters { period: ReportPeriod; date?: string; start_date?: string; end_date?: string; customer_id?: string; status?: DesignOrderStatus | ""; payment_status?: PaymentStatus | "" }
export interface ReportData {
  filter_options: { customers: Array<{ id: string; customer_code: string; full_name: string }> };
  filters: ReportFilters & { start_date: string; end_date: string };
  summary: { total_orders: number; total_sales: string; received_payments: string; expenses: string; supplier_payments: string; profit_loss: string; customer_receivables: string; shop_payables: string; loan_balances: string; cash_movement: string };
  customers: Array<{ customer_id: string; customer_code: string; customer_name: string; total_orders: number; total_order_value: string; total_paid: string; remaining_balance: string; payment_history: Array<{ date: string; amount: string; order_number: string; recorded_by: string; note: string }> }>;
  debts: {
    customer_receivables: Array<{ customer_id: string; customer_name: string; remaining_balance: string }>;
    shop_payables: Array<{ id: string; person_name: string; debt_type: string; original_amount: string; remaining_balance: string; payable_date: string; purpose: string }>;
    loan_repayments: Array<{ id: string; person_name: string; amount: string; payment_date: string; payment_method: string; recorded_by: string }>;
  };
  charts: { financial_trend: Array<{ date: string; sales: string; expenses: string; profit: string; orders: number }> };
}
