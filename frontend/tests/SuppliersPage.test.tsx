import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useSuppliers = vi.fn();
const useSupplier = vi.fn();
const useSupplierTransactions = vi.fn();
const mutateAsync = vi.fn();
vi.mock("@/features/suppliers/hooks", () => ({
  useSuppliers: () => useSuppliers(),
  useSupplier: () => useSupplier(),
  useSupplierTransactions: () => useSupplierTransactions(),
  useSupplierMutations: () => ({ create: { mutateAsync: vi.fn() }, transaction: { mutateAsync }, voidTransaction: { mutateAsync: vi.fn(), isPending: false } }),
}));

import { SupplierDetailPage, SupplierTransactionForm } from "@/features/suppliers/SupplierDetailPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";

const ledger = {
  supplier_name: "کریم الله",
  total_payable: "5000.00",
  total_paid: "2000.00",
  remaining_balance: "3000.00",
  entries: [{ id: "t1", transaction_date: "2026-08-26", type: "DEBIT", description: "د ډایانو اخیستل", amount: "5000.00", balance: "5000.00" }],
};

describe("supplier pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSupplier.mockReturnValue({ data: { id: "s1", name: "کریم الله", phone: "0700" } });
    useSupplierTransactions.mockReturnValue({ data: ledger, isError: false });
  });

  it("renders supplier list and balance", () => {
    useSuppliers.mockReturnValue({ data: [{ id: "s1", name: "کریم الله", phone: "0700", remaining_balance: "3000.00", last_transaction_date: "2026-08-26" }], isLoading: false, isError: false });
    render(<MemoryRouter><SuppliersPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "عرضه کوونکو ته پاتې پیسې" })).toBeInTheDocument();
    expect(screen.getByText("کریم الله")).toBeInTheDocument();
    expect(screen.getByText("3,000.00 AFN")).toBeInTheDocument();
  });

  it("renders supplier transaction table", () => {
    render(<MemoryRouter><SupplierDetailPage /></MemoryRouter>);
    expect(screen.getByText("د ډایانو اخیستل")).toBeInTheDocument();
    expect(screen.getByText("اخیستل شوي مواد یا خدمت")).toBeInTheDocument();
    expect(screen.getByText("+5,000.00 AFN")).toBeInTheDocument();
  });

  it("validates payment amount", () => {
    render(<SupplierTransactionForm supplierId="s1" type="credit" />);
    fireEvent.change(screen.getByLabelText("مقدار"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("تشریح"), { target: { value: "Payment" } });
    fireEvent.submit(screen.getByRole("button", { name: "ورکړه ثبتول" }).closest("form")!);
    expect(screen.getByRole("alert")).toHaveTextContent("مقدار باید له صفر څخه زیات وي.");
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
