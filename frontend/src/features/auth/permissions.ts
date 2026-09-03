import type { User, UserRole } from "@/types/api";

export type Permission =
  | "manage_users"
  | "manage_customers"
  | "manage_design_orders"
  | "manage_design_categories"
  | "manage_payments"
  | "manage_expenses"
  | "view_reports"
  | "manage_backups";

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  OWNER: new Set([
    "manage_users",
    "manage_customers",
    "manage_design_orders",
    "manage_design_categories",
    "manage_payments",
    "manage_expenses",
    "view_reports",
    "manage_backups",
  ]),
  MANAGER: new Set([
    "manage_customers",
    "manage_design_orders",
    "manage_design_categories",
    "manage_payments",
    "manage_expenses",
    "view_reports",
  ]),
  OPERATOR: new Set(["manage_customers", "manage_design_orders"]),
  VIEWER: new Set(["view_reports"]),
};

export function userHasRole(user: User | null, ...roles: UserRole[]): boolean {
  return Boolean(user?.is_active && roles.includes(user.role));
}

export function userHasPermission(user: User | null, permission: Permission): boolean {
  return Boolean(user?.is_active && rolePermissions[user.role].has(permission));
}

export function defaultPathForUser(user: User | null): string {
  if (!user) return "/login";
  return userHasPermission(user, "view_reports") ? "/dashboard" : "/customers";
}
