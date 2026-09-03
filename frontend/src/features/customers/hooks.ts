import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveCustomer,
  createCustomerPayment,
  createCustomer,
  getCustomer,
  getCustomerLedger,
  getCustomerStatement,
  getCustomers,
  getCustomersWithDebt,
  restoreCustomer,
  updateCustomer,
} from "./api";
import type { CustomerInput, CustomerListParams, CustomerPaymentInput } from "./types";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  withDebt: ["customers", "with-debt"] as const,
};

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => getCustomers(params),
  });
}

export function useCustomer(customerId: string) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: () => getCustomer(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCustomerStatement(customerId: string) {
  return useQuery({
    queryKey: [...customerKeys.detail(customerId), "statement"],
    queryFn: () => getCustomerStatement(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCustomerLedger(customerId: string) {
  return useQuery({
    queryKey: [...customerKeys.detail(customerId), "ledger"],
    queryFn: () => getCustomerLedger(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCreateCustomerPayment(customerId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerPaymentInput) => createCustomerPayment(customerId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
      void client.invalidateQueries({ queryKey: customerKeys.lists() });
      void client.invalidateQueries({ queryKey: customerKeys.withDebt });
    },
  });
}

export function useCustomersWithDebt() {
  return useQuery({ queryKey: customerKeys.withDebt, queryFn: getCustomersWithDebt });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
  });
}

export function useUpdateCustomer(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CustomerInput>) => updateCustomer(customerId, input),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customerId), customer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ["design-orders", "overdue-reminders"] });
    },
  });
}

export function useSetCustomerArchived(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archive: boolean) =>
      archive ? archiveCustomer(customerId) : restoreCustomer(customerId),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customerId), customer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: ["design-orders", "overdue-reminders"] });
    },
  });
}
