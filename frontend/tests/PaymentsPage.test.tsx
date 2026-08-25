import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePayments = vi.fn();
vi.mock("@/features/payments/hooks", () => ({ usePayments: (...args: unknown[]) => usePayments(...args) }));

import { PaymentsPage } from "@/features/payments/PaymentsPage";

const result = {
  data: [{ id: "payment-1", amount: "500.00", payment_date: "2026-08-20", note: "", recorded_by_name: "بلال", order_number: "ORD-1", design_name: "لوحه", customer_name: "احمد", created_at: "2026-08-23T19:30:00Z" }],
  meta: { count: 1, page: 1, page_size: 20, total_pages: 1, next: null, previous: null },
};

const renderPage = () => render(<MemoryRouter><PaymentsPage /></MemoryRouter>);

describe("PaymentsPage", () => {
  beforeEach(() => usePayments.mockReset());

  it("renders the RTL payment ledger using the effective payment date", () => {
    usePayments.mockReturnValue({ data: result, isLoading: false, isError: false });
    renderPage();
    expect(screen.getByRole("heading", { name: "تادیات" })).toBeInTheDocument();
    expect(screen.getByText("احمد")).toBeInTheDocument();
    expect(screen.getAllByText("500.00 AFN")).toHaveLength(2);
    expect(screen.getByText(new Date("2026-08-20T00:00:00").toLocaleDateString("ps-AF"))).toBeInTheDocument();
  });

  it("renders loading, empty, and error states", () => {
    usePayments.mockReturnValueOnce({ data: undefined, isLoading: true, isError: false });
    const loading = renderPage();
    expect(screen.getByText("تادیات بارېږي...")).toBeInTheDocument();
    loading.unmount();

    usePayments.mockReturnValueOnce({ data: { ...result, data: [] }, isLoading: false, isError: false });
    const empty = renderPage();
    expect(screen.getByText("هیڅ تادیه ونه موندل شوه.")).toBeInTheDocument();
    empty.unmount();

    usePayments.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, error: new Error("network"), refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("تادیات بار نه شول.");
  });
});
