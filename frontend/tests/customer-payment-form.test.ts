import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { CustomerPaymentForm, paymentSchema } from "@/features/customers/CustomerPaymentForm";

describe("customer payment form", () => {
  it("requires a payment greater than zero", () => {
    expect(paymentSchema.safeParse({ amount: 0, payment_date: "2026-08-25", description: "" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amount: -10, payment_date: "2026-08-25", description: "" }).success).toBe(false);
  });

  it("accepts a valid payment", () => {
    expect(paymentSchema.safeParse({ amount: 300, payment_date: "2026-08-25", description: "Cash" }).success).toBe(true);
  });

  it("does not submit a payment above the remaining debt", async () => {
    const onSubmit = vi.fn();
    render(createElement(CustomerPaymentForm, {
      maxAmount: 100,
      onSubmit,
      onCancel: () => undefined,
    }));

    fireEvent.change(screen.getByLabelText(/مقدار/), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: /تادیه ثبتول/ }));

    await waitFor(() => expect(screen.getByText(/پاتې حساب 100.00 افغانۍ/)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
