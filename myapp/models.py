from django.db import models
from django.contrib.auth.models import Group, User

# Create your models here.
class Book(models.Model):
    title = models.CharField(max_length=100)
    author = models.CharField(max_length=100)
    price = models.FloatField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="books")
    def __str__(self):
        return self.title

class GroupProfile(models.Model):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="profile")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        permissions = [
            ("access_admin_panel", "Can access admin panel"),  # add this
        ]
    def __str__(self):
        return f"{self.group.name} - Profile"
        