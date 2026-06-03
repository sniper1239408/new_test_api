from rest_framework import serializers
from .models import Book, Category, CategoryManagerAssignment
from django.contrib.auth.models import Group, User, Permission
from .models import GroupProfile


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


class CategoryManagerAssignmentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    category_name = serializers.ReadOnlyField(source="category.name")

    class Meta:
        model = CategoryManagerAssignment
        fields = ["id", "user", "username", "category", "category_name"]


class BookSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    category_name = serializers.ReadOnlyField(source="category.name")

    class Meta:
        model = Book
        fields = ["id", "title", "author", "price", "owner", "category", "category_name"]


class GroupProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupProfile
        fields = ["description", "created_at"]


class GroupSerializer(serializers.ModelSerializer):
    profile = GroupProfileSerializer()
    permissions = serializers.SerializerMethodField()
    permission_codenames = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Group
        fields = ["id", "name", "profile", "permissions", "permission_codenames"]

    def get_permissions(self, obj):
        return list(obj.permissions.values_list("codename", flat=True))

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        group = Group.objects.create(**validated_data)
        for field, value in profile_data.items():
            setattr(group.profile, field, value)
        group.profile.save()
        return group

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        permissions_data = validated_data.pop("permission_codenames", None)

        instance.name = validated_data.get("name", instance.name)
        instance.save()

        for field, value in profile_data.items():
            setattr(instance.profile, field, value)
        instance.profile.save()

        if permissions_data is not None:
            permissions = Permission.objects.filter(codename__in=permissions_data)
            instance.permissions.set(permissions)

        return instance


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()
    category_assignments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "is_active",
            "date_joined", "last_login", "groups", "category_assignments",
        ]

    def get_groups(self, obj):
        return [
            {
                "id": group.id,
                "name": group.name,
                "profile": {
                    "description": group.profile.description,
                    "created_at": group.profile.created_at,
                },
                "permissions": list(group.permissions.values_list("codename", flat=True)),
            }
            for group in obj.groups.all()
        ]

    def get_category_assignments(self, obj):
        return [
            {
                "id": a.id,
                "category_id": a.category_id,
                "category_name": a.category.name,
            }
            for a in obj.category_assignments.select_related("category").all()
        ]