import { render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/features/auth/AuthProvider";
import * as authService from "@/features/auth/auth-service";
import { useAuth } from "@/features/auth/auth-context";
import type { User } from "@/types/api";

const owner: User = {
  id: "fcd51a93-5438-4443-996b-6932aace8739",
  email: "owner@example.com",
  full_name: "Shop Owner",
  phone: "",
  role: "OWNER",
  is_active: true,
  created_at: "2026-08-21T00:00:00Z",
  updated_at: "2026-08-21T00:00:00Z",
};

vi.mock("@/features/auth/auth-service", () => ({
  loadCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

function AuthState({ children }: { children?: ReactNode }) {
  const { user, loading, isAuthenticated, hasPermission } = useAuth();
  return (
    <div>
      <span>{loading ? "loading" : "ready"}</span>
      <span>{isAuthenticated ? "authenticated" : "anonymous"}</span>
      <span>{user?.email}</span>
      <span>{hasPermission("manage_users") ? "can-manage-users" : "cannot-manage-users"}</span>
      {children}
    </div>
  );
}

describe("AuthProvider", () => {
  it("restores the current user and exposes permission state", async () => {
    vi.mocked(authService.loadCurrentUser).mockResolvedValue(owner);
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(screen.getByText(owner.email)).toBeInTheDocument();
    expect(screen.getByText("can-manage-users")).toBeInTheDocument();
  });
});
