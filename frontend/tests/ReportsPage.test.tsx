import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReportData } from "@/features/reports/types";

const useFinancialReport = vi.fn();
const generateFinancialReportPdf = vi.fn();
vi.mock("@/features/reports/hooks", () => ({ useFinancialReport: (...args: unknown[]) => useFinancialReport(...args) }));
vi.mock("@/features/reports/report-pdf", () => ({ generateFinancialReportPdf: (...args: unknown[]) => generateFinancialReportPdf(...args) }));

import { ReportsPage } from "@/features/reports/ReportsPage";

const data: ReportData = {
  filter_options: { customers: [{ id: "customer-1", customer_code: "CUS-1", full_name: "احمد" }] },
  filters: { period: "monthly", start_date: "2026-08-01", end_date: "2026-08-23" },
  summary: { total_orders: 2, total_sales: "2000.00", received_payments: "1200.00", expenses: "200.00", supplier_payments: "250.00", profit_loss: "1800.00", customer_receivables: "800.00", shop_payables: "300.00", loan_balances: "250.00", cash_movement: "750.00", cash_balance: "750.00" },
  expenses: {
    total: "200.00",
    groups: [
      { key: "machine", label: "د ماشین اړوند مصارف", total: "150.00" },
      { key: "daily", label: "خوراکي او ورځني مصارف", total: "30.00" },
      { key: "other", label: "نور مصارف", total: "20.00" },
    ],
    rows: [
      { group: "machine", group_label: "د ماشین اړوند مصارف", subcategory: "ډایان", amount: "150.00", percentage: "75.0" },
      { group: "daily", group_label: "خوراکي او ورځني مصارف", subcategory: "خوراکي او ورځني مصارف", amount: "30.00", percentage: "15.0" },
      { group: "other", group_label: "نور مصارف", subcategory: "نور مصارف", amount: "20.00", percentage: "10.0" },
    ],
  },
  customers: [{ customer_id: "customer-1", customer_code: "CUS-1", customer_name: "احمد", total_orders: 2, total_order_value: "2000.00", total_paid: "1200.00", remaining_balance: "800.00", payment_history: [{ date: "2026-08-20", amount: "1200.00", order_number: "ORD-1", recorded_by: "بلال", note: "" }] }],
  debts: { customer_receivables: [{ customer_id: "customer-1", customer_name: "احمد", remaining_balance: "800.00" }], shop_payables: [{ id: "payable-1", person_name: "عرضه کوونکی", debt_type: "COMPANY_SUPPLIER", original_amount: "500.00", remaining_balance: "300.00", payable_date: "2026-08-10", purpose: "مواد" }], loan_repayments: [{ id: "repayment-1", person_name: "محمود", amount: "50.00", payment_date: "2026-08-12", payment_method: "CASH", recorded_by: "بلال" }] },
  charts: { financial_trend: [{ date: "2026-08-20", sales: "1200.00", expenses: "200.00", profit: "1000.00", orders: 2 }] },
};

describe("ReportsPage", () => {
  beforeEach(() => {
    useFinancialReport.mockReset();
    generateFinancialReportPdf.mockReset();
  });

  it("exports PDF with current filters and keeps CSV and print actions", async () => {
    useFinancialReport.mockReturnValue({ data, isLoading: false, isError: false });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    render(<ReportsPage />);

    fireEvent.change(screen.getByLabelText("مشتري"), { target: { value: "customer-1" } });
    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    await waitFor(() => expect(generateFinancialReportPdf).toHaveBeenCalledWith(
      data,
      expect.objectContaining({ customer_id: "customer-1", period: "monthly" }),
    ));

    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "چاپ" }));
    expect(print).toHaveBeenCalledOnce();
  });

  it("renders summary, customer, debt, and repayment reports", () => {
    useFinancialReport.mockReturnValue({ data, isLoading: false, isError: false });
    render(<ReportsPage />);
    expect(screen.getByRole("heading", { name: "راپورونه" })).toBeInTheDocument();
    expect(screen.getAllByText("2,000.00 AFN").length).toBeGreaterThan(0);
    expect(screen.getByText("د مشتریانو راپور")).toBeInTheDocument();
    expect(screen.getAllByText("احمد").length).toBeGreaterThan(0);
    expect(screen.getByText("عرضه کوونکی")).toBeInTheDocument();
    expect(screen.getByText("محمود")).toBeInTheDocument();
    expect(screen.getAllByText("موږ ته پاتې حسابونه").length).toBeGreaterThan(0);
    expect(screen.getAllByText("زموږ پر غاړه پاتې پورونه").length).toBeGreaterThan(0);
    expect(screen.getByText("په کومه برخه کې څومره مصرف شوی؟")).toBeInTheDocument();
    expect(screen.getByText("ډایان")).toBeInTheDocument();
  });

  it("styles profit and loss as different business outcomes", () => {
    useFinancialReport.mockReturnValue({ data, isLoading: false, isError: false });
    const profitView = render(<ReportsPage />);
    expect(screen.getByText("ګټه").closest("article")).toHaveClass("from-emerald-50");
    profitView.unmount();

    useFinancialReport.mockReturnValue({
      data: { ...data, summary: { ...data.summary, profit_loss: "-350.00" } },
      isLoading: false,
      isError: false,
    });
    render(<ReportsPage />);
    const lossCard = screen.getByText("زیان").closest("article");
    expect(lossCard).toHaveClass("from-rose-50");
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
