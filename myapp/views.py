from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import Permission, Group, User

from .models import Book, Category, CategoryManagerAssignment
from .serializers import (
    BookSerializer, GroupSerializer, UserSerializer,
    CategorySerializer, CategoryManagerAssignmentSerializer,
)
from .permissions import (
    BookPermission, CanAccessAdminPanel,
    CanManageCategories, CanManageCategoryAssignments,
    get_user_role,
)


class BookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated, BookPermission]

    def get_queryset(self):
        # All authenticated roles can see all books
        return Book.objects.select_related("category", "owner").all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        role = get_user_role(self.request.user)
        # If a Category Manager is changing the category field, verify they own the target category too
        if role == "Category Manager" and "category" in self.request.data:
            new_category_id = self.request.data.get("category")
            if new_category_id is None:
                raise PermissionDenied("Category Managers cannot remove a book's category.")
            has_target = CategoryManagerAssignment.objects.filter(
                user=self.request.user, category_id=new_category_id
            ).exists()
            if not has_target:
                raise PermissionDenied("You can only move books into your own assigned categories.")
        serializer.save()


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        # Anyone authenticated can read; only Owner/Manager can write
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageCategories()]


class CategoryManagerAssignmentViewSet(viewsets.ModelViewSet):
    queryset = CategoryManagerAssignment.objects.select_related("user", "category").all()
    serializer_class = CategoryManagerAssignmentSerializer
    permission_classes = [IsAuthenticated, CanManageCategoryAssignments]

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "").strip()
        email    = request.data.get("email", "").strip()

        if not username or not password:
            return Response(
                {"error": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username is already taken."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(username=username, password=password, email=email)

        try:
            viewer_group = Group.objects.get(name="Viewer")
            user.groups.add(viewer_group)
        except Group.DoesNotExist:
            # Viewer group hasn't been created yet — run: python manage.py setup_roles
            pass

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {"token": token.key, "username": user.username},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        groups = user.groups.select_related("profile").all()
        group_data = [{"name": g.name, "description": g.profile.description} for g in groups]

        permissions = (
            Permission.objects
            .filter(group__user=user)
            .values_list("codename", flat=True)
        )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "username": user.username,
            "role": get_user_role(user),
            "groups": group_data,
            "permissions": list(permissions),
        })


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.select_related("profile").prefetch_related("permissions").all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class AdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_access = (
            Permission.objects
            .filter(group__user=request.user, codename="access_admin_panel")
            .exists()
        )
        return Response({"has_access": has_access})


class UserListView(APIView):
    permission_classes = [IsAuthenticated, CanAccessAdminPanel]

    def get(self, request):
        users = User.objects.prefetch_related(
            "groups__profile", "groups__permissions", "category_assignments__category"
        ).all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, CanAccessAdminPanel]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.username = request.data.get("username", user.username)
        user.email = request.data.get("email", user.email)
        user.is_active = request.data.get("is_active", user.is_active)

        password = request.data.get("password")
        if password:
            user.set_password(password)

        group_ids = request.data.get("groups")
        if group_ids is not None:
            user.groups.set(group_ids)

        user.save()
        return Response(UserSerializer(user).data)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)