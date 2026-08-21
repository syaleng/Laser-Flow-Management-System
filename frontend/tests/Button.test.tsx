import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders an accessible button", () => {
    render(<Button>Save job</Button>);
    expect(screen.getByRole("button", { name: "Save job" })).toBeInTheDocument();
  });
});

