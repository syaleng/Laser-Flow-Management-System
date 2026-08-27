export type DashboardPeriod = "today" | "week" | "month" | "year" | "custom";

export interface DashboardData {
  period: DashboardPeriod;
  start_date: string;
  end_date: string;
  cards: { orders: number; sales: string; received_payments: string; expenses: string; supplier_payments: string; profit_loss: string; cash_balance: string; customer_receivables: string; shop_payables: string; net_financial_position: string };
  debt: { customer_receivables: string; loan_receivables: string; shop_payables: string };
  charts: {
    income_expense_profit: Array<{ date: string; income: string; expenses: string; profit: string }>;
    expense_categories: Array<{ category: string; label: string; value: string }>;
    payment_trend: Array<{ date: string; value: string }>;
    order_trend: Array<{ date: string; value: number }>;
  };
  recent_activity: Array<{ type: "order" | "payment" | "expense" | "loan_repayment" | "payable_repayment" | "supplier_payment"; title: string; detail: string; date: string; created_at: string; user: string }>;
}

export interface DashboardFilters { period: DashboardPeriod; start_date?: string; end_date?: string }
