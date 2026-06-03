from django.db import models
from django.contrib.auth.models import Group, User


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Book(models.Model):
    title = models.CharField(max_length=100)
    author = models.CharField(max_length=100)
    price = models.FloatField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="books")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="books",
    )

    def __str__(self):
        return self.title


class CategoryManagerAssignment(models.Model):
    """Records that a user with the 'Category Manager' group manages a specific category."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="category_assignments")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="managers")

    class Meta:
        unique_together = ("user", "category")

    def __str__(self):
        return f"{self.user.username} → {self.category.name}"


class GroupProfile(models.Model):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="profile")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        permissions = [
            ("access_admin_panel", "Can access admin panel"),
        ]

    def __str__(self):
        return f"{self.group.name} - Profile"