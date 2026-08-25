import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportData } from "@/features/reports/types";

const useFinancialReport = vi.fn();
vi.mock("@/features/reports/hooks", () => ({ useFinancialReport: (...args: unknown[]) => useFinancialReport(...args) }));

import { ReportsPage } from "@/features/reports/ReportsPage";

const data: ReportData = {
  filter_options: { customers: [{ id: "customer-1", customer_code: "CUS-1", full_name: "احمد" }] },
  filters: { period: "monthly", start_date: "2026-08-01", end_date: "2026-08-23" },
  summary: { total_orders: 2, total_sales: "2000.00", received_payments: "1200.00", expenses: "200.00", profit_loss: "1000.00", customer_receivables: "800.00", shop_payables: "300.00", loan_balances: "250.00", cash_movement: "750.00" },
  customers: [{ customer_id: "customer-1", customer_code: "CUS-1", customer_name: "احمد", total_orders: 2, total_order_value: "2000.00", total_paid: "1200.00", remaining_balance: "800.00", payment_history: [{ date: "2026-08-20", amount: "1200.00", order_number: "ORD-1", recorded_by: "بلال", note: "" }] }],
  debts: { customer_receivables: [{ customer_id: "customer-1", customer_name: "احمد", remaining_balance: "800.00" }], shop_payables: [{ id: "payable-1", person_name: "عرضه کوونکی", debt_type: "COMPANY_SUPPLIER", original_amount: "500.00", remaining_balance: "300.00", payable_date: "2026-08-10", purpose: "مواد" }], loan_repayments: [{ id: "repayment-1", person_name: "محمود", amount: "50.00", payment_date: "2026-08-12", payment_method: "CASH", recorded_by: "بلال" }] },
  charts: { financial_trend: [{ date: "2026-08-20", sales: "1200.00", expenses: "200.00", profit: "1000.00", orders: 2 }] },
};

describe("ReportsPage", () => {
  beforeEach(() => useFinancialReport.mockReset());

  it("renders summary, customer, debt, and repayment reports", () => {
    useFinancialReport.mockReturnValue({ data, isLoading: false, isError: false });
    render(<ReportsPage />);
    expect(screen.getByRole("heading", { name: "راپورونه" })).toBeInTheDocument();
    expect(screen.getAllByText("2,000.00 AFN").length).toBeGreaterThan(0);
    expect(screen.getByText("د مشتریانو راپور")).toBeInTheDocument();
    expect(screen.getAllByText("احمد").length).toBeGreaterThan(0);
    expect(screen.getByText("عرضه کوونکی")).toBeInTheDocument();
    expect(screen.getByText("محمود")).toBeInTheDocument();
  });

  it("styles profit and loss as different business outcomes", () => {
    useFinancialReport.mockReturnValue({ data, isLoading: false, isError: false });
    const profitView = render(<ReportsPage />);
    expect(screen.getByText("ګټه").closest("article")).toHaveClass("bg-emerald-50");
    profitView.unmount();

    useFinancialReport.mockReturnValue({
      data: { ...data, summary: { ...data.summary, profit_loss: "-350.00" } },
      isLoading: false,
      isError: false,
    });
    render(<ReportsPage />);
    const lossCard = screen.getByText("زیان").closest("article");
    expect(lossCard).toHaveClass("bg-rose-50");
    expect(lossCard).toHaveTextContent("350.00 AFN");
    expect(lossCard).not.toHaveTextContent("-350.00 AFN");
  });

  it("renders the loading state", () => {
    useFinancialReport.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<ReportsPage />);
    expect(screen.getByLabelText("راپور پورته کېږي")).toBeInTheDocument();
  });

  it("renders the empty state", () => {
    useFinancialReport.mockReturnValue({ data: { ...data, summary: { ...data.summary, total_orders: 0, received_payments: "0.00", expenses: "0.00" }, customers: [], debts: { customer_receivables: [], shop_payables: [], loan_repayments: [] } }, isLoading: false, isError: false });
    render(<ReportsPage />);
    expect(screen.getByText("معلومات نشته")).toBeInTheDocument();
    expect(screen.getByText("د مشتریانو معلومات نشته.")).toBeInTheDocument();
  });

  it("renders an error and retries", () => {
    const refetch = vi.fn();
    useFinancialReport.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("Network failed"), refetch });
    render(<ReportsPage />);
    expect(screen.getByText("راپور پورته نه شو")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /بیا هڅه/ }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
