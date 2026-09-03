import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupplier, createSupplierTransaction, getSupplier, getSupplierTransactions, getSuppliers, updateSupplier, voidSupplierTransaction } from "./api";

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: ["suppliers", "list"] as const,
  detail: (id: string) => ["suppliers", "detail", id] as const,
  transactions: (id: string) => ["suppliers", "transactions", id] as const,
};

export const useSuppliers = () => useQuery({ queryKey: supplierKeys.list, queryFn: getSuppliers });
export const useSupplier = (id: string) => useQuery({ queryKey: supplierKeys.detail(id), queryFn: () => getSupplier(id), enabled: Boolean(id) });
export const useSupplierTransactions = (id: string) => useQuery({ queryKey: supplierKeys.transactions(id), queryFn: () => getSupplierTransactions(id), enabled: Boolean(id) });

export function useSupplierMutations() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: supplierKeys.all });
    // Supplier payments affect the global financial dashboard as well.
    void client.invalidateQueries({ queryKey: ["dashboard-data"] });
    void client.invalidateQueries({ queryKey: ["journal"] });
  };
  return {
    create: useMutation({ mutationFn: createSupplier, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, ...input }: { id: string; name: string; phone: string; description: string }) => updateSupplier(id, input), onSuccess: invalidate }),
    transaction: useMutation({
      mutationFn: ({ id, type, ...input }: { id: string; type: "debit" | "credit"; amount: number; transaction_date: string; description: string }) => createSupplierTransaction(id, type, input),
      onSuccess: invalidate,
    }),
    voidTransaction: useMutation({
      mutationFn: ({ id, transactionId, reason }: { id: string; transactionId: string; reason: string }) => voidSupplierTransaction(id, transactionId, reason),
      onSuccess: invalidate,
    }),
  };
}
