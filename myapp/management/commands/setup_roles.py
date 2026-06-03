from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from myapp.models import Category


class Command(BaseCommand):
    help = "Creates the five role groups with correct permissions and five example categories."

    def handle(self, *args, **options):
        self._setup_groups()
        self._setup_categories()
        self.stdout.write(self.style.SUCCESS("Setup complete."))

    def _setup_groups(self):
        try:
            perm_add    = Permission.objects.get(codename="add_book")
            perm_change = Permission.objects.get(codename="change_book")
            perm_delete = Permission.objects.get(codename="delete_book")
            perm_view   = Permission.objects.get(codename="view_book")
            perm_admin  = Permission.objects.get(codename="access_admin_panel")
        except Permission.DoesNotExist as exc:
            self.stderr.write(f"Permission missing: {exc}. Make sure you have run migrate first.")
            return

        role_map = {
            "Library Owner":    [perm_add, perm_change, perm_delete, perm_view, perm_admin],
            "Library Manager":  [perm_add, perm_change, perm_delete, perm_view, perm_admin],
            "Category Manager": [perm_add, perm_change, perm_delete, perm_view],
            "Author":           [perm_add, perm_change, perm_view],
            "Viewer":           [perm_view],
        }

        for name, perms in role_map.items():
            group, created = Group.objects.get_or_create(name=name)
            group.permissions.set(perms)
            label = "Created" if created else "Updated"
            self.stdout.write(f"  {label} group: {name}")

    def _setup_categories(self):
        sample = [
            ("Fiction",     "Novels, short stories, and other fictional works"),
            ("Non-Fiction", "Biographies, essays, journalism, and factual writing"),
            ("Science",     "Physics, biology, chemistry, and related fields"),
            ("History",     "Historical accounts and analysis"),
            ("Technology",  "Computing, engineering, and tech topics"),
        ]
        for name, desc in sample:
            _, created = Category.objects.get_or_create(name=name, defaults={"description": desc})
            if created:
                self.stdout.write(f"  Created category: {name}")