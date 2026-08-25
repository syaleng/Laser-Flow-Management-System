import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get, post } }));

import { getLoanRepayments, recordLoanRepayment, recordPayableRepayment } from "@/features/daily-journal/api";

describe("repayment API", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("loads loan repayment history", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    await getLoanRepayments("loan-1");
    expect(get).toHaveBeenCalledWith("/journal/loans/loan-1/repayments/");
  });

  it("posts repayment details for loans and payables", async () => {
    post.mockResolvedValue({ data: { data: { id: "account-1" } } });
    const input = { amount: 200, payment_date: "2026-08-23", payment_method: "BANK" as const, note: "Installment" };
    await recordLoanRepayment("loan-1", input);
    await recordPayableRepayment("payable-1", input);
    expect(post).toHaveBeenNthCalledWith(1, "/journal/loans/loan-1/repayments/", input);
    expect(post).toHaveBeenNthCalledWith(2, "/journal/payables/payable-1/repayments/", input);
  });
});
