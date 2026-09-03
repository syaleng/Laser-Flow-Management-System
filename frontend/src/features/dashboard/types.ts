export type DateFilter = "today" | "week" | "month" | "year" | "custom";

/** Parameters accepted by the dashboard endpoint. */
export interface DashboardFilters {
  filter?: DateFilter;
}

export interface DashboardActivity {
  id: string;
  type:
    | "new_order"
    | "customer_payment"
    | "expense"
    | "debt_recovered"
    | "debt_given"
    | "payment_made";
  label: string;
  amount: number;
  date: string;
  detail?: string;
  user?: string;
}

export interface DashboardResponse {
  totalSales: number;
  cash: number;
  receivables: number;
  payables: number;
  totalExpenses: number;
  profit: number;
  activities: DashboardActivity[];
  // ... include other chart data fields if necessary
}
