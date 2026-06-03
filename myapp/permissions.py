from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Permission

# Roles checked highest-priority first; the first match wins.
ROLE_PRIORITY = [
    "Library Owner",
    "Library Manager",
    "Category Manager",
    "Author",
    "Viewer",
]


def get_user_role(user):
    """Return the highest-priority role group the user belongs to."""
    group_names = set(user.groups.values_list("name", flat=True))
    for role in ROLE_PRIORITY:
        if role in group_names:
            return role
    return "Viewer"  # default if no recognised group is assigned


class BookPermission(BasePermission):
    """
    Enforces the five-level book hierarchy:

    Library Owner   — full CRUD on all books
    Library Manager — full CRUD on all books
    Category Manager— full CRUD only on books in their assigned category/ies
    Author          — create in any category; update only their own books; no delete
    Viewer          — read-only
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = get_user_role(request.user)

        # Everyone can list and retrieve
        if view.action in ["list", "retrieve"]:
            return True

        # Viewers: read-only
        if role == "Viewer":
            self.message = "Viewers can only read books."
            return False

        # Category Managers creating a book must specify one of their categories
        if view.action == "create" and role == "Category Manager":
            from .models import CategoryManagerAssignment
            category_id = request.data.get("category")
            if not category_id:
                self.message = "Category Managers must assign a category when creating a book."
                return False
            assigned = CategoryManagerAssignment.objects.filter(
                user=request.user, category_id=category_id
            ).exists()
            if not assigned:
                self.message = "You can only create books in your assigned categories."
            return assigned

        # Authors, Managers, and Owners can proceed to object-level checks
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        role = get_user_role(request.user)

        # Everyone can read individual books
        if view.action == "retrieve":
            return True

        # Owner and Manager: unrestricted write access
        if role in ["Library Owner", "Library Manager"]:
            return True

        # Category Manager: only books that belong to one of their categories
        if role == "Category Manager":
            from .models import CategoryManagerAssignment
            allowed = CategoryManagerAssignment.objects.filter(
                user=request.user, category=obj.category
            ).exists()
            if not allowed:
                self.message = "You can only modify books in your assigned categories."
            return allowed

        # Author: update own books only; no delete
        if role == "Author":
            if view.action in ["update", "partial_update"]:
                if obj.owner != request.user:
                    self.message = "Authors can only update their own books."
                return obj.owner == request.user
            self.message = "Authors cannot delete books."
            return False

        return False


class CanAccessAdminPanel(BasePermission):
    message = "You do not have permission to access the admin panel."

    def has_permission(self, request, view):
        return (
            Permission.objects
            .filter(group__user=request.user, codename="access_admin_panel")
            .exists()
        )


class CanManageCategories(BasePermission):
    """Library Owner and Library Manager can create/edit/delete category records."""
    message = "Only Library Owners and Managers can manage categories."

    def has_permission(self, request, view):
        return get_user_role(request.user) in ["Library Owner", "Library Manager"]


class CanManageCategoryAssignments(BasePermission):
    """Library Owner and Library Manager can assign category managers."""
    message = "Only Library Owners and Managers can manage category assignments."

    def has_permission(self, request, view):
        return get_user_role(request.user) in ["Library Owner", "Library Manager"]