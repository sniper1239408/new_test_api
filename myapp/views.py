from django.shortcuts import render
from rest_framework import viewsets
from .models import Book
from .serializers import BookSerializer, GroupSerializer, UserSerializer
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import Permission, Group, User
from .permissions import GroupPermission, CanAccessAdminPanel, IsBookOwner

# Create your views here.

class BookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated, IsBookOwner]

    def get_queryset(self):
        user = self.request.user

        # check if user has admin permission
        is_admin = (
            Permission.objects
            .filter(group__user=user, codename="access_admin_panel")
            .exists()
        )

        if is_admin:
            return Book.objects.all()  # admins see all books
        
        return Book.objects.filter(owner=user)  # regular users see only their books

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Get the user's groups
        groups = user.groups.values_list("name", flat=True)
        groups = user.groups.select_related('profile').all()
        group_data = [
            {
                "name": g.name,
                "description": g.profile.description
            }
            for g in groups
        ]

        # Get all permissions from those groups
        permissions = (
            Permission.objects
            .filter(group__user=user)
            .values_list("codename", flat=True)
        )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "username": user.username,
            "groups": group_data,
            "permissions": list(permissions)  # send permissions to frontend
        })

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.select_related('profile').prefetch_related('permissions').all()
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()

class AdminView(APIView):
    permission_classes = [IsAuthenticated]  # don't block here, handle it manually

    def get(self, request):
        has_access = (
            Permission.objects
            .filter(group__user=request.user, codename="access_admin_panel")
            .exists()
        )

        return Response({"has_access": has_access})

class UserListView(APIView):
    permission_classes = [IsAuthenticated, CanAccessAdminPanel]  # admin only

    def get(self, request):
        users = User.objects.prefetch_related('groups__profile', 'groups__permissions').all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class UserDetailView(APIView):
    permission_classes = [IsAuthenticated, CanAccessAdminPanel]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        # update basic fields
        user.username = request.data.get("username", user.username)
        user.email = request.data.get("email", user.email)
        user.is_active = request.data.get("is_active", user.is_active)

        # update password only if provided
        password = request.data.get("password")
        if password:
            user.set_password(password)  # hashes it properly

        # update groups only if provided
        group_ids = request.data.get("groups")
        if group_ids is not None:
            user.groups.set(group_ids)  # replace all groups with new ones

        user.save()

        return Response(UserSerializer(user).data)