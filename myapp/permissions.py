from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Permission

class GroupPermission(BasePermission):

    # define which action needs which permission
    ACTION_PERMISSION_MAP = {
        "list":           "view_book",
        "retrieve":       "view_book",
        "create":         "add_book",
        "update":         "change_book",
        "partial_update": "change_book",
        "destroy":        "delete_book",
    }

    def has_permission(self, request, view):
        # get the required permission for this action
        required_permission = self.ACTION_PERMISSION_MAP.get(view.action)

        if not required_permission:
            return False  # block unknown actions

        # get all permissions from the user's groups
        group_permissions = (
            Permission.objects
            .filter(group__user=request.user)
            .values_list("codename", flat=True)
        )

        # check if required permission is in the group's permissions
        has_access = required_permission in group_permissions

        if not has_access:
            self.message = f"Your group does not have '{required_permission}' permission."

        return has_access

class CanAccessAdminPanel(BasePermission):
    message = "You do not have permission to access the admin panel."

    def has_permission(self, request, view):
        return (
            Permission.objects
            .filter(group__user=request.user, codename="access_admin_panel")
            .exists()
        )

class IsBookOwner(BasePermission):
    message = "You can only view your own books."

    def has_object_permission(self, request, view, obj):
        is_admin = (
            Permission.objects
            .filter(group__user=request.user, codename="access_admin_panel")
            .exists()
        )

        if is_admin:
            return True  # admins can access any book

        return obj.owner == request.user  # others only their own