import { apiClient } from "@/lib/api-client";
import type { DashboardFilters, DashboardResponse, DateFilter } from "./types";

interface DashboardApiPayload {
  cards?: Record<string, string | number>;
  recent_activity?: Array<{ type: string; title: string; detail: string; date: string; created_at: string; user: string }>;
}

// Assuming axios or fetch is used elsewhere, keeping the same API structure
export async function getDashboardData(
  filter: DateFilter,
): Promise<DashboardResponse> {
  const { data } = await apiClient.get<{ data: DashboardApiPayload }>("/journal/dashboard/", {
    params: { period: filter },
  });
  const value = data.data;
  const cards = value.cards ?? {};
  return {
    totalSales: Number(cards.sales ?? 0),
    cash: Number(cards.cash_balance ?? 0),
    receivables: Number(cards.customer_receivables ?? 0),
    payables: Number(cards.shop_payables ?? 0),
    totalExpenses: Number(cards.expenses ?? 0),
    profit: Number(cards.profit_loss ?? 0),
    activities: (value.recent_activity ?? []).map((activity) => ({
      id: `${activity.type}-${activity.created_at}`,
      type: activity.type as DashboardResponse["activities"][number]["type"],
      label: ({ order: "نوی فرمایش", payment: "تادیه ترلاسه شوه", expense: "لګښت ثبت شو", loan_repayment: "پور بېرته ترلاسه شو", supplier_payment: "عرضه کوونکي ته تادیه", payable_repayment: "د پور قسط ورکړل شو" } as Record<string, string>)[activity.type] ?? activity.title,
      amount: Number(activity.detail.split(" ")[0]) || 0,
      detail: activity.detail,
      date: activity.date,
      user: activity.user,
    })),
  };
}

// Kept for callers using the dashboard hook; both APIs target the same endpoint.
export function getDashboard(filters: DashboardFilters = {}): Promise<DashboardResponse> {
  return getDashboardData(filters.filter ?? "today");
}
