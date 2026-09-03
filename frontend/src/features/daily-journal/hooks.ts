import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { closeJournalDay, createCashReconciliation, createExpense, createLoan, createPayable, getCashReconciliations, getClosings, getExpenses, getJournalSummary, getLoans, getPayables, recordLoanRepayment, recordPayableRepayment, updateExpense, updateLoan, updatePayable, voidCashReconciliation, voidExpense, voidLoan, voidLoanRepayment, voidPayable, voidPayableRepayment } from "./api";

export const journalKeys = {
  all: ["journal"] as const,
  summary: (date: string) => ["journal", "summary", date] as const,
  expenses: (date: string) => ["journal", "expenses", date] as const,
  loans: (date: string) => ["journal", "loans", date] as const,
  payables: (date: string) => ["journal", "payables", date] as const,
  closings: ["journal", "closings"] as const,
  reconciliations: (date: string) => ["journal", "cash-reconciliations", date] as const,
};

export function useJournal(date: string) {
  const client = useQueryClient();
  const summary = useQuery({ queryKey: journalKeys.summary(date), queryFn: () => getJournalSummary(date) });
  const expenses = useQuery({ queryKey: journalKeys.expenses(date), queryFn: () => getExpenses(date) });
  const loans = useQuery({ queryKey: journalKeys.loans(date), queryFn: () => getLoans(date) });
  const payables = useQuery({ queryKey: journalKeys.payables(date), queryFn: () => getPayables(date) });
  const closings = useQuery({ queryKey: journalKeys.closings, queryFn: getClosings });
  const reconciliations = useQuery({ queryKey: journalKeys.reconciliations(date), queryFn: () => getCashReconciliations(date) });
  const invalidate = () => { void client.invalidateQueries({ queryKey: journalKeys.all }); };
  const addExpense = useMutation({ mutationFn: createExpense, onSuccess: invalidate });
  const addLoan = useMutation({ mutationFn: createLoan, onSuccess: invalidate });
  const addPayable = useMutation({ mutationFn: createPayable, onSuccess: invalidate });
  const editExpense = useMutation({ mutationFn: ({ id, ...input }: Parameters<typeof updateExpense>[1] & { id: string }) => updateExpense(id, input), onSuccess: invalidate });
  const removeExpense = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => voidExpense(id, reason), onSuccess: invalidate });
  const editLoan = useMutation({ mutationFn: ({ id, ...input }: Parameters<typeof updateLoan>[1] & { id: string }) => updateLoan(id, input), onSuccess: invalidate });
  const removeLoan = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => voidLoan(id, reason), onSuccess: invalidate });
  const editPayable = useMutation({ mutationFn: ({ id, ...input }: Parameters<typeof updatePayable>[1] & { id: string }) => updatePayable(id, input), onSuccess: invalidate });
  const removePayable = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => voidPayable(id, reason), onSuccess: invalidate });
  const removeLoanRepayment = useMutation({ mutationFn: ({ id, repaymentId, reason }: { id: string; repaymentId: string; reason: string }) => voidLoanRepayment(id, repaymentId, reason), onSuccess: invalidate });
  const removePayableRepayment = useMutation({ mutationFn: ({ id, repaymentId, reason }: { id: string; repaymentId: string; reason: string }) => voidPayableRepayment(id, repaymentId, reason), onSuccess: invalidate });
  const repayLoan = useMutation({ mutationFn: ({ id, ...input }: { id: string; amount: number; payment_date: string; payment_method: "CASH" | "BANK" | "OTHER"; note: string }) => recordLoanRepayment(id, input), onSuccess: invalidate });
  const repayPayable = useMutation({ mutationFn: ({ id, ...input }: { id: string; amount: number; payment_date: string; payment_method: "CASH" | "BANK" | "OTHER"; note: string }) => recordPayableRepayment(id, input), onSuccess: invalidate });
  const closeDay = useMutation({ mutationFn: closeJournalDay, onSuccess: invalidate });
  const reconcileCash = useMutation({ mutationFn: createCashReconciliation, onSuccess: invalidate });
  const removeReconciliation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => voidCashReconciliation(id, reason), onSuccess: invalidate });
  return { summary, expenses, loans, payables, closings, reconciliations, addExpense, addLoan, addPayable, editExpense, removeExpense, editLoan, removeLoan, editPayable, removePayable, removeLoanRepayment, removePayableRepayment, repayLoan, repayPayable, closeDay, reconcileCash, removeReconciliation };
}
