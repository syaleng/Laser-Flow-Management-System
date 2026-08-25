import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/types/api";

import type {
  DesignCategory,
  DesignOrder,
  DesignOrderInput,
  DesignOrderListParams,
  DesignOrderPage,
  DesignOrderStatus,
  OverdueDebtReminder,
} from "./types";

function toFormData(input: Partial<DesignOrderInput>): FormData {
  const form = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    form.append(key, String(value));
  });
  return form;
}

export async function getDesignOrders(params: DesignOrderListParams): Promise<DesignOrderPage> {
  const { data } = await apiClient.get<DesignOrderPage>("/design-orders/", { params });
  return data;
}

export async function getDesignOrder(id: string): Promise<DesignOrder> {
  const { data } = await apiClient.get<ApiEnvelope<DesignOrder>>(`/design-orders/${id}/`);
  return data.data;
}

export async function getDesignCategories(): Promise<DesignCategory[]> {
  const { data } = await apiClient.get<{ data: DesignCategory[] }>(
    "/design-categories/",
    { params: { is_active: "true", page_size: 100 } },
  );
  return data.data;
}

export async function createDesignOrder(input: DesignOrderInput): Promise<DesignOrder> {
  const { data } = await apiClient.post<ApiEnvelope<DesignOrder>>(
    "/design-orders/",
    toFormData(input),
  );
  return data.data;
}

export async function updateDesignOrder(
  id: string,
  input: Partial<DesignOrderInput>,
): Promise<DesignOrder> {
  const { data } = await apiClient.patch<ApiEnvelope<DesignOrder>>(
    `/design-orders/${id}/`,
    toFormData(input),
  );
  return data.data;
}

export async function changeDesignOrderStatus(
  id: string,
  status: DesignOrderStatus,
  note = "",
): Promise<DesignOrder> {
  const { data } = await apiClient.post<ApiEnvelope<DesignOrder>>(
    `/design-orders/${id}/status/`,
    { status, note },
  );
  return data.data;
}

export async function recordDesignOrderPayment(
  id: string,
  input: { amount: number; note?: string; payment_date?: string },
): Promise<DesignOrder> {
  const { data } = await apiClient.post<ApiEnvelope<DesignOrder>>(
    `/design-orders/${id}/payments/`,
    input,
  );
  return data.data;
}

export async function getOverdueDebtReminders(): Promise<{
  data: OverdueDebtReminder[];
  count: number;
}> {
  const { data } = await apiClient.get<{ data: OverdueDebtReminder[]; count: number }>(
    "/design-orders/overdue-reminders/",
  );
  return data;
}
