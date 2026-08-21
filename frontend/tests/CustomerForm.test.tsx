import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { CustomerForm } from "@/features/customers/CustomerForm";

describe("CustomerForm", () => {
  it("requires a WhatsApp number when consent is selected", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CustomerForm
          submitLabel="Create customer"
          cancelTo="/customers"
          onSubmit={submit}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Maryam Customer" },
    });
    fireEvent.click(screen.getByLabelText(/customer consents/i));
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    expect(
      await screen.findByText("Enter a WhatsApp number before recording consent"),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits valid customer information", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CustomerForm
          submitLabel="Create customer"
          cancelTo="/customers"
          onSubmit={submit}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Maryam Customer" },
    });
    fireEvent.change(screen.getByLabelText(/^whatsapp number/i), {
      target: { value: "0700123456" },
    });
    fireEvent.click(screen.getByLabelText(/customer consents/i));
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Maryam Customer",
        whatsapp_number: "0700123456",
        whatsapp_consent: true,
      }),
    );
  });
});

