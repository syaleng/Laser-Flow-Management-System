import { apiClient } from "@/lib/api-client";

import type { PaymentPage } from "./types";

export async function getPayments(params: { search?: string; page?: number }): Promise<PaymentPage> {
  const { data } = await apiClient.get<PaymentPage>("/payments/", {
    params: { ...params, page_size: 20 },
  });
  return data;
}
