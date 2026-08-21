from rest_framework.permissions import BasePermission

from .authorization import Capability, user_has_capability


class IsOwner(BasePermission):
    message = "Only an owner can perform this action."

    def has_permission(self, request, view):
        return user_has_capability(request.user, Capability.MANAGE_USERS)


class HasRequiredCapability(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        capability = getattr(view, "required_capability", None)
        return capability is not None and user_has_capability(request.user, capability)
