import { describe, expect, it } from "vitest";

import {
  userHasPermission,
  userHasRole,
} from "@/features/auth/permissions";
import type { User, UserRole } from "@/types/api";

function buildUser(role: UserRole, isActive = true): User {
  return {
    id: "fcd51a93-5438-4443-996b-6932aace8739",
    email: "user@example.com",
    full_name: "LaserFlow User",
    phone: "",
    role,
    is_active: isActive,
    created_at: "2026-08-21T00:00:00Z",
    updated_at: "2026-08-21T00:00:00Z",
  };
}

describe("role permissions", () => {
  it("allows only owners to manage users", () => {
    expect(userHasPermission(buildUser("OWNER"), "manage_users")).toBe(true);
    expect(userHasPermission(buildUser("MANAGER"), "manage_users")).toBe(false);
  });

  it("gives operators operational access without financial access", () => {
    const operator = buildUser("OPERATOR");
    expect(userHasPermission(operator, "manage_design_orders")).toBe(true);
    expect(userHasPermission(operator, "manage_payments")).toBe(false);
  });

  it("rejects permissions and roles for inactive users", () => {
    const inactiveOwner = buildUser("OWNER", false);
    expect(userHasPermission(inactiveOwner, "manage_users")).toBe(false);
    expect(userHasRole(inactiveOwner, "OWNER")).toBe(false);
  });
});
