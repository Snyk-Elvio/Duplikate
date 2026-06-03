from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "is_manager", "is_staff", "is_active", "last_seen"]
    list_filter = ["is_manager", "is_staff", "is_active"]
    search_fields = ["email"]
    readonly_fields = ["last_seen", "date_joined", "last_login"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Roles", {"fields": ("is_manager", "is_staff", "is_superuser", "is_active")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Activity", {"fields": ("last_seen", "last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "is_manager", "is_staff"),
            },
        ),
    )
