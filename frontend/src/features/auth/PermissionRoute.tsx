import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./auth-context";
import type { Permission } from "./permissions";

export function PermissionRoute({ permission }: { permission: Permission }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

