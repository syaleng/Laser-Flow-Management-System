import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { get } }));

import { getCustomerStatement } from "@/features/customers/api";

describe("customer statement API", () => {
  beforeEach(() => get.mockReset());

  it("requests the customer financial statement endpoint", async () => {
    get.mockResolvedValue({
      data: {
        data: {
          total_orders: 1,
          total_amount: "1000.00",
          total_paid: "400.00",
          remaining_balance: "600.00",
          orders: [],
          payments: [],
        },
      },
    });

    const statement = await getCustomerStatement("customer-1");

    expect(statement.remaining_balance).toBe("600.00");
    expect(get).toHaveBeenCalledWith("/customers/customer-1/statement/");
  });
});