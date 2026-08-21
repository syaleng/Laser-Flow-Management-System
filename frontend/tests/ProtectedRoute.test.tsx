import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const anonymousContext: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  loading: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(() => false),
  hasPermission: vi.fn(() => false),
};

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", () => {
    render(
      <AuthContext.Provider value={anonymousContext}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<Outlet />}>
                <Route path="dashboard" element={<div>Dashboard</div>} />
              </Route>
            </Route>
            <Route path="login" element={<div>Login screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});

