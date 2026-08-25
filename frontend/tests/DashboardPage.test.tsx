import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardData } from "@/features/dashboard/types";

const useDashboard = vi.fn();
vi.mock("@/features/dashboard/hooks", () => ({ useDashboard: (...args: unknown[]) => useDashboard(...args) }));
vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: { full_name: "بلال احمدزی" },
    hasPermission: (permission: string) => permission === "view_reports",
  }),
}));

import { DashboardPage } from "@/features/dashboard/DashboardPage";

const data: DashboardData = {
  period: "today", start_date: "2026-08-23", end_date: "2026-08-23",
  cards: { orders: 3, received_payments: "1200.00", expenses: "200.00", profit_loss: "1000.00", customer_receivables: "5000.00", shop_payables: "700.00", net_financial_position: "4550.00" },
  debt: { customer_receivables: "5000.00", loan_receivables: "250.00", shop_payables: "700.00" },
  charts: {
    income_expense_profit: [{ date: "2026-08-23", income: "1200.00", expenses: "200.00", profit: "1000.00" }],
    expense_categories: [{ category: "MATERIALS", label: "مواد", value: "200.00" }],
    payment_trend: [{ date: "2026-08-23", value: "1200.00" }],
    order_trend: [{ date: "2026-08-23", value: 3 }],
  },
  recent_activity: [{ type: "payment", title: "Payment received", detail: "1200 AFN · ORD-1", date: "2026-08-23", created_at: "2026-08-23T10:00:00Z", user: "بلال احمدزی" }],
};

describe("DashboardPage", () => {
  beforeEach(() => useDashboard.mockReset());

  it("renders the simple API-backed cards and activity", () => {
    useDashboard.mockReturnValue({ data, isLoading: false, isError: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1,200.00 AFN")).toBeInTheDocument();
    expect(screen.getByText("د مشتریانو پاتې پور")).toBeInTheDocument();
    expect(screen.getByText("ګټه")).toBeInTheDocument();
    expect(screen.getByText("1200 AFN · ORD-1")).toBeInTheDocument();
  });

  it("styles profit and loss as different business outcomes", () => {
    useDashboard.mockReturnValue({ data, isLoading: false, isError: false });
    const profitView = render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText("ګټه").closest("article")).toHaveClass("bg-emerald-50");
    profitView.unmount();

    useDashboard.mockReturnValue({
      data: { ...data, cards: { ...data.cards, profit_loss: "-302.96" } },
      isLoading: false,
      isError: false,
    });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const lossCard = screen.getByText("زیان").closest("article");
    expect(lossCard).toHaveClass("bg-rose-50");
    expect(lossCard).toHaveTextContent("302.96 AFN");
    expect(lossCard).not.toHaveTextContent("-302.96 AFN");
  });

  it("shows a loading state", () => {
    useDashboard.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByLabelText("معلومات پورته کېږي")).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    useDashboard.mockReturnValue({ data: { ...data, cards: { ...data.cards, orders: 0, received_payments: "0.00", expenses: "0.00" }, recent_activity: [], charts: { ...data.charts, expense_categories: [] } }, isLoading: false, isError: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText("په دې موده کې معلومات نشته")).toBeInTheDocument();
  });

  it("shows an error and retries", () => {
    const refetch = vi.fn();
    useDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("Network failed"), refetch });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(screen.getByText("معلومات پورته نه شول")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /بیا هڅه/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
