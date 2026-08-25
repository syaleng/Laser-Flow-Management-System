import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  getCustomerLedger,
  getCustomerStatement,
  getCustomers,
  restoreCustomer,
  updateCustomer,
} from "./api";
import type { CustomerInput, CustomerListParams } from "./types";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
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
    },
  });
}

