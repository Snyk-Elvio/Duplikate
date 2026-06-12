from django import forms
from django.contrib import admin

from .models import Template
from .widgets import QuillWidget


class TemplateAdminForm(forms.ModelForm):
    class Meta:
        model = Template
        fields = "__all__"
        widgets = {"html": QuillWidget()}


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    form = TemplateAdminForm
    list_display = ["name", "is_published", "created_by", "updated_at"]
    list_filter = ["is_published"]
    search_fields = ["name", "html"]
    list_editable = ["is_published"]
    readonly_fields = ["created_by", "created_at", "updated_at"]

    actions = ["publish", "unpublish"]

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Publish selected templates")
    def publish(self, request, queryset):
        queryset.update(is_published=True)

    @admin.action(description="Unpublish selected templates")
    def unpublish(self, request, queryset):
        queryset.update(is_published=False)
