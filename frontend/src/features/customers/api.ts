import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/types/api";

import type {
  Customer,
  CustomerInput,
  CustomerListParams,
  CustomerPage,
} from "./types";

export async function getCustomers(params: CustomerListParams): Promise<CustomerPage> {
  const { data } = await apiClient.get<CustomerPage>("/customers/", { params });
  return data;
}

export async function getCustomer(customerId: string): Promise<Customer> {
  const { data } = await apiClient.get<ApiEnvelope<Customer>>(`/customers/${customerId}/`);
  return data.data;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data } = await apiClient.post<ApiEnvelope<Customer>>("/customers/", input);
  return data.data;
}

export async function updateCustomer(
  customerId: string,
  input: Partial<CustomerInput>,
): Promise<Customer> {
  const { data } = await apiClient.patch<ApiEnvelope<Customer>>(
    `/customers/${customerId}/`,
    input,
  );
  return data.data;
}

export async function archiveCustomer(customerId: string): Promise<Customer> {
  const { data } = await apiClient.post<ApiEnvelope<Customer>>(
    `/customers/${customerId}/archive/`,
  );
  return data.data;
}

export async function restoreCustomer(customerId: string): Promise<Customer> {
  const { data } = await apiClient.post<ApiEnvelope<Customer>>(
    `/customers/${customerId}/restore/`,
  );
  return data.data;
}

