import { apiClient } from "@/lib/api-client";
import type { Supplier, SupplierTransactions } from "./types";

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ data: Supplier[] }>("/suppliers/");
  return data.data;
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await apiClient.get<{ data: Supplier }>(`/suppliers/${id}/`);
  return data.data;
}

export async function createSupplier(input: { name: string; phone: string; description: string }): Promise<Supplier> {
  const { data } = await apiClient.post<{ data: Supplier }>("/suppliers/", input);
  return data.data;
}
export async function updateSupplier(id: string, input: { name: string; phone: string; description: string }): Promise<Supplier> {
  const { data } = await apiClient.patch<{ data: Supplier }>(`/suppliers/${id}/`, input);
  return data.data;
}

export async function createSupplierTransaction(
  id: string,
  type: "debit" | "credit",
  input: { amount: number; transaction_date: string; description: string },
) {
  const { data } = await apiClient.post(`/suppliers/${id}/transactions/${type}/`, input);
  return data;
}

export async function getSupplierTransactions(id: string): Promise<SupplierTransactions> {
  const { data } = await apiClient.get<{ data: SupplierTransactions }>(`/suppliers/${id}/transactions/`);
  return data.data;
}

export async function voidSupplierTransaction(id: string, transactionId: string, reason: string) {
  await apiClient.post(`/suppliers/${id}/transactions/${transactionId}/void/`, { reason });
}
