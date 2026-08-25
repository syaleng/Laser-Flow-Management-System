import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignOrderStatusBadge } from "@/features/design-orders/DesignOrderStatusBadge";
import { nextStatuses } from "@/features/design-orders/status";

describe("design order workflow", () => {
  it("renders a readable workflow status", () => {
    render(<DesignOrderStatusBadge status="READY_FOR_DELIVERY" />);
    expect(screen.getByText("بشپړ شوی")).toBeInTheDocument();
  });

  it("allows only controlled next steps", () => {
    expect(nextStatuses.CUTTING).toEqual(["READY_FOR_DELIVERY", "CANCELLED"]);
    expect(nextStatuses.DELIVERED).toEqual([]);
  });
});
