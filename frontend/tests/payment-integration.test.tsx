import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordPayment } = vi.hoisted(() => ({ recordPayment: vi.fn() }));
vi.mock("@/features/design-orders/api", () => ({ recordDesignOrderPayment: recordPayment }));

import { useRecordDesignOrderPayment } from "@/features/design-orders/hooks";

describe("payment financial integration", () => {
  beforeEach(() => recordPayment.mockReset());

  it("invalidates customer, payment, journal, and dashboard data", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const order = { customer: { id: "customer-1" } };
    recordPayment.mockResolvedValue(order);

    const { result } = renderHook(() => useRecordDesignOrderPayment("order-1"), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await act(async () => {
      await result.current.mutateAsync({ amount: 300, payment_date: "2026-08-23" });
    });

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalled());
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["payments"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["journal"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["customers", "detail", "customer-1"] });
  });
});