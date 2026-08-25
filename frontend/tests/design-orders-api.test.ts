import { beforeEach, describe, expect, it, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api-client", () => ({ apiClient: { post } }));

import { createDesignOrder } from "@/features/design-orders/api";

describe("design orders API", () => {
  beforeEach(() => post.mockReset());

  it("sends the current order form as multipart data", async () => {
    post.mockResolvedValue({ data: { data: { id: "order-1" } } });

    await createDesignOrder({
      customer_id: "11111111-1111-4111-8111-111111111111",
      design_name: "Floral border",
      design_description: "",
      cut_quantity: 20,
      unit_price: 25,
      paid_amount: 0,
      payment_status: "CREDIT",
      status: "NEW",
      design_type: "SIMPLE",
      color_count: "1",
      gemstone_size: 6,
      baran_size_mm: 5,
      order_date: "2026-08-21",
      expected_delivery_date: "2026-08-25",
      notes: "",
    });

    const body = post.mock.calls[0][1] as FormData;
    expect(body.get("customer_id")).toBe("11111111-1111-4111-8111-111111111111");
    expect(body.get("payment_status")).toBe("CREDIT");
    expect(body.get("paid_amount")).toBe("0");
    expect(post).toHaveBeenCalledWith("/design-orders/", expect.any(FormData));
  });
});
