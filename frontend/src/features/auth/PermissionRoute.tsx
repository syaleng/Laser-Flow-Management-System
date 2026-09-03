import { Outlet } from "react-router-dom";

import { useAuth } from "./auth-context";
import type { Permission } from "./permissions";
import { AccessDeniedPage } from "@/features/system/SystemStatePages";

export function PermissionRoute({ permission }: { permission: Permission }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <Outlet /> : <AccessDeniedPage />;
}
