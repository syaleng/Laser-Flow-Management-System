import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "./api";
import type { DashboardFilters } from "./types";

export function useDashboard(filters: DashboardFilters, enabled = true) {
  return useQuery({ queryKey: ["dashboard", filters], queryFn: () => getDashboard(filters), enabled });
}
