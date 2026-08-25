import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { CustomerForm } from "@/features/customers/CustomerForm";

describe("CustomerForm", () => {
  it("requires a mobile number", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <CustomerForm submitLabel="ثبتول" cancelTo="/customers" onSubmit={submit} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/بشپړ نوم/i), {
      target: { value: "Maryam Customer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ثبتول" }));

    expect(await screen.findByText("د موبایل شمېره ولیکئ")).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

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

    fireEvent.change(screen.getByLabelText(/بشپړ نوم/i), {
      target: { value: "Maryam Customer" },
    });
    fireEvent.change(screen.getByLabelText(/د موبایل شمېره/i), {
      target: { value: "0700111222" },
    });
    fireEvent.click(screen.getByLabelText(/د WhatsApp خبرتیا اجازه/i));
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    expect(
      await screen.findByText("له اجازې ثبتولو مخکې د WhatsApp شمېره ولیکئ"),
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

    fireEvent.change(screen.getByLabelText(/بشپړ نوم/i), {
      target: { value: "Maryam Customer" },
    });
    fireEvent.change(screen.getByLabelText(/د موبایل شمېره/i), {
      target: { value: "0700111222" },
    });
    fireEvent.change(screen.getByLabelText(/WhatsApp شمېره/i), {
      target: { value: "0700123456" },
    });
    fireEvent.click(screen.getByLabelText(/د WhatsApp خبرتیا اجازه/i));
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Maryam Customer",
        phone: "0700111222",
        whatsapp_number: "0700123456",
        whatsapp_consent: true,
      }),
    );
  });
});
