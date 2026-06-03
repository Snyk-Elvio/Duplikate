from django.contrib import admin

from .models import SharedResponse


@admin.register(SharedResponse)
class SharedResponseAdmin(admin.ModelAdmin):
    list_display = ["id", "sender", "recipient", "template", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["sender__email", "recipient__email", "resolved_text"]
    # Snapshots are immutable.
    readonly_fields = ["resolved_text", "template", "sender", "recipient", "created_at"]

    def has_change_permission(self, request, obj=None):
        return False
