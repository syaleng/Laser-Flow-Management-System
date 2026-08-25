from enum import StrEnum

from .models import UserRole


class Capability(StrEnum):
    MANAGE_USERS = "manage_users"
    MANAGE_CUSTOMERS = "manage_customers"
    MANAGE_DESIGN_ORDERS = "manage_design_orders"
    MANAGE_DESIGN_CATEGORIES = "manage_design_categories"
    MANAGE_PAYMENTS = "manage_payments"
    MANAGE_EXPENSES = "manage_expenses"
    VIEW_REPORTS = "view_reports"


ALL_CAPABILITIES = frozenset(Capability)

ROLE_CAPABILITIES: dict[str, frozenset[Capability]] = {
    UserRole.OWNER: ALL_CAPABILITIES,
    UserRole.MANAGER: frozenset(
        {
            Capability.MANAGE_CUSTOMERS,
            Capability.MANAGE_DESIGN_ORDERS,
            Capability.MANAGE_DESIGN_CATEGORIES,
            Capability.MANAGE_PAYMENTS,
            Capability.MANAGE_EXPENSES,
            Capability.VIEW_REPORTS,
        }
    ),
    UserRole.OPERATOR: frozenset({Capability.MANAGE_CUSTOMERS, Capability.MANAGE_DESIGN_ORDERS}),
    UserRole.VIEWER: frozenset({Capability.VIEW_REPORTS}),
}


def user_has_capability(user, capability: Capability) -> bool:
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if user.is_superuser:
        return True
    return capability in ROLE_CAPABILITIES.get(user.role, frozenset())
