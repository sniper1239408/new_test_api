from rest_framework import serializers
from .models import Book
from django.contrib.auth.models import Group, User, Permission
from .models import GroupProfile

class BookSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Book
        fields = '__all__'  # include all fields
    #check if user has admin permissions. if yes, show all books, otherwise only show the logged in user's books
    def get_queryset(self):
        return Book.objects.all() if self.request.user.has_perm("myapp.access_admin_panel") else Book.objects.filter(owner=self.request.user)


class GroupProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupProfile
        fields = ['description', 'created_at']

class GroupSerializer(serializers.ModelSerializer):
    profile = GroupProfileSerializer()  # nest the profile inside group
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'profile', 'permissions']
        
    def get_permissions(self, obj):
        return list(obj.permissions.values_list('codename', flat=True))

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        group = Group.objects.create(**validated_data)

        for field, value in profile_data.items():
            setattr(group.profile, field, value)
        group.profile.save()

        return group

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        permissions_data = validated_data.pop('permissions', None)

        instance.name = validated_data.get('name', instance.name)
        instance.save()

        # update profile
        for field, value in profile_data.items():
            setattr(instance.profile, field, value)
        instance.profile.save()

        # update permissions if provided
        if permissions_data is not None:
            permissions = Permission.objects.filter(codename__in=permissions_data)
            instance.permissions.set(permissions)  # replace all permissions

        return instance

class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'date_joined', 'last_login', 'groups']

    def get_groups(self, obj):
        return [
            {
                "id": group.id,
                "name": group.name,
                "profile": {
                    "description": group.profile.description,
                    "created_at": group.profile.created_at,
                },
                "permissions": list(group.permissions.values_list('codename', flat=True))  # codename not id
            }
            for group in obj.groups.all()
        ]