import { apiClient } from "@/lib/api-client";
import type { DashboardData, DashboardFilters } from "./types";

export async function getDashboard(filters: DashboardFilters): Promise<DashboardData> {
  const { data } = await apiClient.get<{ data: DashboardData }>("/journal/dashboard/", { params: filters });
  return data.data;
}
