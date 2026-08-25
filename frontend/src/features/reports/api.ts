import { apiClient } from "@/lib/api-client";
import type { ReportData, ReportFilters } from "./types";

export async function getFinancialReport(filters: ReportFilters): Promise<ReportData> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));
  const { data } = await apiClient.get<{ data: ReportData }>("/reports/", { params });
  return data.data;
}
