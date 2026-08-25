import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { closeJournalDay, createExpense, createLoan, createPayable, getClosings, getExpenses, getJournalSummary, getLoans, getPayables, recordLoanRepayment, recordPayableRepayment } from "./api";

export const journalKeys = {
  all: ["journal"] as const,
  summary: (date: string) => ["journal", "summary", date] as const,
  expenses: (date: string) => ["journal", "expenses", date] as const,
  loans: (date: string) => ["journal", "loans", date] as const,
  payables: (date: string) => ["journal", "payables", date] as const,
  closings: ["journal", "closings"] as const,
};

export function useJournal(date: string) {
  const client = useQueryClient();
  const summary = useQuery({ queryKey: journalKeys.summary(date), queryFn: () => getJournalSummary(date) });
  const expenses = useQuery({ queryKey: journalKeys.expenses(date), queryFn: () => getExpenses(date) });
  const loans = useQuery({ queryKey: journalKeys.loans(date), queryFn: () => getLoans(date) });
  const payables = useQuery({ queryKey: journalKeys.payables(date), queryFn: () => getPayables(date) });
  const closings = useQuery({ queryKey: journalKeys.closings, queryFn: getClosings });
  const invalidate = () => { void client.invalidateQueries({ queryKey: journalKeys.all }); };
  const addExpense = useMutation({ mutationFn: createExpense, onSuccess: invalidate });
  const addLoan = useMutation({ mutationFn: createLoan, onSuccess: invalidate });
  const addPayable = useMutation({ mutationFn: createPayable, onSuccess: invalidate });
  const repayLoan = useMutation({ mutationFn: ({ id, ...input }: { id: string; amount: number; payment_date: string; payment_method: "CASH" | "BANK" | "OTHER"; note: string }) => recordLoanRepayment(id, input), onSuccess: invalidate });
  const repayPayable = useMutation({ mutationFn: ({ id, ...input }: { id: string; amount: number; payment_date: string; payment_method: "CASH" | "BANK" | "OTHER"; note: string }) => recordPayableRepayment(id, input), onSuccess: invalidate });
  const closeDay = useMutation({ mutationFn: closeJournalDay, onSuccess: invalidate });
  return { summary, expenses, loans, payables, closings, addExpense, addLoan, addPayable, repayLoan, repayPayable, closeDay };
}
