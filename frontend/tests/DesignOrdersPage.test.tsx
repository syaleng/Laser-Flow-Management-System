import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/design-orders/hooks", () => ({
  useDesignCategories: () => ({ data: [{ id: "category-1", name: "Scarf", is_active: true }] }),
  useDesignOrders: () => ({
    isLoading: false,
    isError: false,
    data: {
      data: [{
        id: "order-1",
        order_number: "ORD-2026-ABC12345",
        customer: { id: "customer-1", customer_code: "CUS-001", full_name: "Ahmad Customer", phone: "", whatsapp_number: "" },
        design_category: { id: "category-1", name: "Scarf" },
        design_name: "Floral scarf edge",
        cut_quantity: 40,
        unit_price: "25.00",
        total_amount: "1000.00",
        paid_amount: "400.00",
        remaining_amount: "600.00",
        payment_status: "PARTIAL",
        order_date: "2026-08-21",
        expected_delivery_date: "2026-08-25",
        actual_delivery_date: null,
        status: "CUTTING",
        created_at: "2026-08-21T10:00:00Z",
      }],
      meta: { count: 1, page: 1, page_size: 20, total_pages: 1, next: null, previous: null },
    },
  }),
}));

import { DesignOrdersPage } from "@/features/design-orders/DesignOrdersPage";

describe("DesignOrdersPage", () => {
  it("renders order, customer, amount, and workflow status", () => {
    render(<MemoryRouter><DesignOrdersPage /></MemoryRouter>);
    expect(screen.getByText("Floral scarf edge")).toBeInTheDocument();
    expect(screen.getByText("Ahmad Customer")).toBeInTheDocument();
    expect(screen.getByText("1,000.00 AFN")).toBeInTheDocument();
    expect(screen.getByText("پرې کول روان دي")).toBeInTheDocument();
  });
});
