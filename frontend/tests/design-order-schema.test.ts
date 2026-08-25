import { describe, expect, it } from "vitest";

import { designOrderSchema } from "@/features/design-orders/design-order-schema";

const validOrder = {
  customer_id: "11111111-1111-4111-8111-111111111111",
  design_name: "Scarf border pattern",
  design_description: "Floral edge decoration",
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
};

describe("designOrderSchema", () => {
  it("accepts a valid clothing decoration order", () => {
    expect(designOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it("rejects delivery before the order date", () => {
    const result = designOrderSchema.safeParse({ ...validOrder, expected_delivery_date: "2026-08-20" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["expected_delivery_date"]);
  });

  it("rejects non-positive quantity and price", () => {
    const result = designOrderSchema.safeParse({ ...validOrder, cut_quantity: 0, unit_price: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(["cut_quantity", "unit_price"]));
  });
});
