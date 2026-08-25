import { useQuery } from "@tanstack/react-query";
import { getFinancialReport } from "./api";
import type { ReportFilters } from "./types";

export function useFinancialReport(filters: ReportFilters, enabled = true) {
  return useQuery({ queryKey: ["reports", "financial", filters], queryFn: () => getFinancialReport(filters), enabled });
}
