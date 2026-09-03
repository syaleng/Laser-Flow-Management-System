import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardResponse } from "@/features/dashboard/types";

const useDashboard = vi.fn();
vi.mock("@/features/dashboard/hooks", () => ({ useDashboard: (...args: unknown[]) => useDashboard(...args) }));
import { DashboardPage } from "@/features/dashboard/DashboardPage";

const data: DashboardResponse = {
  totalSales: 2000, cash: 700, receivables: 5000, payables: 700,
  totalExpenses: 200, profit: 1800,
  activities: [{ id: "a1", type: "customer_payment", label: "تادیه ترلاسه شوه", amount: 1200, detail: "1200 AFN · ORD-1", date: "2026-08-23", user: "بلال" }],
};

describe("DashboardPage", () => {
  beforeEach(() => useDashboard.mockReset());
  it("renders financial cards and activity", () => { useDashboard.mockReturnValue({ data, isLoading: false, isError: false }); render(<MemoryRouter><DashboardPage /></MemoryRouter>); expect(screen.getAllByText("2,000.00 AFN").length).toBeGreaterThan(0); expect(screen.getAllByText("خرڅلاو").length).toBeGreaterThan(0); expect(screen.getByText("موږ ته پاتې حسابونه")).toBeInTheDocument(); expect(screen.getByText(/1200 AFN/)).toBeInTheDocument(); });
  it("shows profit and absolute loss", () => { useDashboard.mockReturnValue({ data: { ...data, profit: -302.96 }, isLoading: false, isError: false }); render(<MemoryRouter><DashboardPage /></MemoryRouter>); expect(screen.getAllByText("زیان").length).toBeGreaterThan(0); expect(screen.getAllByText("302.96 AFN").length).toBeGreaterThan(0); });
  it("shows loading state", () => { useDashboard.mockReturnValue({ isLoading: true, isError: false }); render(<MemoryRouter><DashboardPage /></MemoryRouter>); expect(screen.getByLabelText("معلومات پورته کېږي")).toBeInTheDocument(); });
  it("shows empty activity state", () => { useDashboard.mockReturnValue({ data: { ...data, activities: [] }, isLoading: false, isError: false }); render(<MemoryRouter><DashboardPage /></MemoryRouter>); expect(screen.getByText("په دې موده کې معلومات نشته")).toBeInTheDocument(); });
  it("retries an error", () => { const refetch = vi.fn(); useDashboard.mockReturnValue({ isLoading: false, isError: true, refetch }); render(<MemoryRouter><DashboardPage /></MemoryRouter>); fireEvent.click(screen.getByRole("button", { name: /بیا هڅه/ })); expect(refetch).toHaveBeenCalledOnce(); });
});
