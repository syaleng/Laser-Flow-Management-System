import { describe, expect, it } from "vitest";

import { paymentSchema } from "@/features/customers/CustomerPaymentForm";

describe("customer payment form", () => {
  it("requires a payment greater than zero", () => {
    expect(paymentSchema.safeParse({ amount: 0, payment_date: "2026-08-25", description: "" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: -10, payment_date: "2026-08-25", description: "" }).success).toBe(false);
  });

  it("accepts a valid payment", () => {
    expect(paymentSchema.safeParse({ amount: 300, payment_date: "2026-08-25", description: "Cash" }).success).toBe(true);
  });
});