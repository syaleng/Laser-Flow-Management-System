import { apiClient } from "@/lib/api-client";

import type { DailyClosing, Expense, JournalReport, JournalSummary, MoneyLoan, PayableAccount, Repayment, PaymentMethod } from "./types";

export async function getJournalSummary(date: string): Promise<JournalSummary> {
  const { data } = await apiClient.get<{ data: JournalSummary }>("/journal/summary/", { params: { date } });
  return data.data;
}

export async function getJournalReport(date: string, period: string): Promise<JournalReport> {
  const { data } = await apiClient.get<{ data: JournalReport }>("/journal/reports/", { params: { date, period } });
  return data.data;
}

export async function getExpenses(date: string): Promise<Expense[]> {
  const { data } = await apiClient.get<{ data: Expense[] }>("/journal/expenses/", { params: { date, page_size: 100 } });
  return data.data;
}

export async function createExpense(input: { category: string; amount: number; expense_date: string; note: string }): Promise<Expense> {
  const { data } = await apiClient.post<{ data: Expense }>("/journal/expenses/", input);
  return data.data;
}

export async function getLoans(date: string): Promise<MoneyLoan[]> {
  const { data } = await apiClient.get<{ data: MoneyLoan[] }>("/journal/loans/", { params: { date, page_size: 100 } });
  return data.data;
}

export async function getLoanRepayments(id: string): Promise<Repayment[]> {
  const { data } = await apiClient.get<{ data: Repayment[] }>(`/journal/loans/${id}/repayments/`);
  return data.data;
}

export async function recordLoanRepayment(id: string, input: { amount: number; payment_date: string; payment_method: PaymentMethod; note: string }) {
  const { data } = await apiClient.post<{ data: MoneyLoan }>(`/journal/loans/${id}/repayments/`, input);
  return data.data;
}

export async function createLoan(input: { person_name: string; debt_type: string; amount: number; returned_amount: number; purpose: string; loan_date: string; note: string }): Promise<MoneyLoan> {
  const { data } = await apiClient.post<{ data: MoneyLoan }>("/journal/loans/", input);
  return data.data;
}

export async function getPayables(date: string): Promise<PayableAccount[]> {
  const { data } = await apiClient.get<{ data: PayableAccount[] }>("/journal/payables/", { params: { date, page_size: 100 } });
  return data.data;
}

export async function getPayableRepayments(id: string): Promise<Repayment[]> {
  const { data } = await apiClient.get<{ data: Repayment[] }>(`/journal/payables/${id}/repayments/`);
  return data.data;
}

export async function recordPayableRepayment(id: string, input: { amount: number; payment_date: string; payment_method: PaymentMethod; note: string }) {
  const { data } = await apiClient.post<{ data: PayableAccount }>(`/journal/payables/${id}/repayments/`, input);
  return data.data;
}

export async function createPayable(input: { person_name: string; debt_type: string; amount: number; paid_amount: number; payable_date: string; purpose: string; note: string }): Promise<PayableAccount> {
  const { data } = await apiClient.post<{ data: PayableAccount }>("/journal/payables/", input);
  return data.data;
}

export async function closeJournalDay(date: string): Promise<DailyClosing> {
  const { data } = await apiClient.post<{ data: DailyClosing }>("/journal/close/", { date });
  return data.data;
}

export async function getClosings(): Promise<DailyClosing[]> {
  const { data } = await apiClient.get<{ data: DailyClosing[] }>("/journal/closings/", { params: { page_size: 100 } });
  return data.data;
}
