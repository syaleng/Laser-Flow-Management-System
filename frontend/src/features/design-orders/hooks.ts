import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "@/features/customers/hooks";
import { journalKeys } from "@/features/daily-journal/hooks";
import { paymentKeys } from "@/features/payments/hooks";

import {
  changeDesignOrderStatus,
  createDesignOrder,
  getDesignCategories,
  getDesignOrder,
  getDesignOrders,
  getOverdueDebtReminders,
  recordDesignOrderPayment,
  updateDesignOrder,
} from "./api";
import type { DesignOrderInput, DesignOrderListParams, DesignOrderStatus } from "./types";

export const designOrderKeys = {
  all: ["design-orders"] as const,
  lists: () => [...designOrderKeys.all, "list"] as const,
  list: (params: DesignOrderListParams) => [...designOrderKeys.lists(), params] as const,
  details: () => [...designOrderKeys.all, "detail"] as const,
  detail: (id: string) => [...designOrderKeys.details(), id] as const,
  categories: ["design-categories", "active"] as const,
  overdueReminders: ["design-orders", "overdue-reminders"] as const,
};

export function useDesignOrders(params: DesignOrderListParams) {
  return useQuery({ queryKey: designOrderKeys.list(params), queryFn: () => getDesignOrders(params) });
}

export function useDesignOrder(id: string) {
  return useQuery({ queryKey: designOrderKeys.detail(id), queryFn: () => getDesignOrder(id), enabled: Boolean(id) });
}

export function useDesignCategories() {
  return useQuery({ queryKey: designOrderKeys.categories, queryFn: getDesignCategories, staleTime: 300_000 });
}

export function useCreateDesignOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createDesignOrder,
    onSuccess: () => client.invalidateQueries({ queryKey: designOrderKeys.lists() }),
  });
}

export function useUpdateDesignOrder(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<DesignOrderInput>) => updateDesignOrder(id, input),
    onSuccess: (order) => {
      client.setQueryData(designOrderKeys.detail(id), order);
      void client.invalidateQueries({ queryKey: designOrderKeys.lists() });
      void client.invalidateQueries({ queryKey: designOrderKeys.overdueReminders });
    },
  });
}

export function useChangeDesignOrderStatus(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ status, note }: { status: DesignOrderStatus; note?: string }) =>
      changeDesignOrderStatus(id, status, note),
    onSuccess: (order) => {
      client.setQueryData(designOrderKeys.detail(id), order);
      void client.invalidateQueries({ queryKey: designOrderKeys.lists() });
      void client.invalidateQueries({ queryKey: designOrderKeys.overdueReminders });
    },
  });
}

export function useRecordDesignOrderPayment(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount: number; note?: string; payment_date?: string }) =>
      recordDesignOrderPayment(id, input),
    onSuccess: (order) => {
      client.setQueryData(designOrderKeys.detail(id), order);
      void client.invalidateQueries({ queryKey: designOrderKeys.lists() });
      void client.invalidateQueries({ queryKey: designOrderKeys.overdueReminders });
      void client.invalidateQueries({ queryKey: customerKeys.detail(order.customer.id) });
      void client.invalidateQueries({ queryKey: paymentKeys.all });
      void client.invalidateQueries({ queryKey: journalKeys.all });
      void client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useOverdueDebtReminders(enabled = true) {
  return useQuery({
    queryKey: designOrderKeys.overdueReminders,
    queryFn: getOverdueDebtReminders,
    enabled,
    refetchInterval: 300_000,
  });
}
