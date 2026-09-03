export interface JournalSummary {
  date: string;
  opening_balance: string;
  customer_payments: string;
  other_income: string;
  cash_adjustments: string;
  money_received: string;
  loan_returns: string;
  loan_given: string;
  payable_payments: string;
  closing_balance: string;
  sales: string;
  transactions: JournalTransaction[];
  income: string;
  expenses: string;
  customer_debts: string;
  money_loan_receivables: string;
  loans_given: string;
  cash_balance: string;
  net_profit: string;
  total_receivables: string;
  total_payables: string;
  net_financial_position: string;
}

export interface JournalReport {
  period: string;
  start_date: string;
  end_date: string;
  income: string;
  expenses: string;
  loans_given: string;
  net_profit: string;
  cash_balance: string;
  opening_balance: string;
  customer_payments: string;
  other_income: string;
  loan_returns: string;
  loan_given: string;
  payable_payments: string;
  closing_balance: string;
  sales: string;
  transactions: JournalTransaction[];
}

export interface JournalTransaction {
  transaction_type: string;
  direction: "in" | "out" | "non_cash";
  amount: string;
  date: string;
  time: string;
  user: string;
  related: string;
  order_number: string;
}

export interface Expense {
  id: string;
  category: string;
  category_label: string;
  amount: string;
  expense_date: string;
  note: string;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface MoneyLoan {
  id: string;
  person_name: string;
  debt_type: string;
  amount: string;
  returned_amount: string;
  remaining_balance: string;
  purpose: string;
  loan_date: string;
  note: string;
  status: "OPEN" | "PARTIALLY_RETURNED" | "RETURNED";
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
  repayments?: Repayment[];
}

export interface PayableAccount {
  id: string;
  person_name: string;
  debt_type: string;
  origin: "CREDIT_PURCHASE" | "CASH_LOAN";
  amount: string;
  paid_amount: string;
  remaining_balance: string;
  status: "OPEN" | "PARTIAL" | "PAID";
  payable_date: string;
  purpose: string;
  note: string;
  repayments?: Repayment[];
}

export type PaymentMethod = "CASH" | "BANK" | "OTHER";

export interface Repayment {
  id: string;
  amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  note: string;
  created_by_name: string;
  created_at: string;
}

export interface DailyClosing {
  id: string;
  closing_date: string;
  opening_balance: string;
  customer_payments: string;
  other_income: string;
  money_received: string;
  loan_returns: string;
  loan_given: string;
  payable_payments: string;
  closing_balance: string;
  total_income: string;
  total_expenses: string;
  net_profit: string;
  closed_by_name: string;
  created_at: string;
}

export interface CashReconciliation {
  id: string;
  reconciliation_date: string;
  system_balance: string;
  actual_balance: string;
  difference: string;
  reason: string;
  created_by_name: string;
  created_at: string;
}
