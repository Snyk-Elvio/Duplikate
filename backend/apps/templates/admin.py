from django import forms
from django.contrib import admin

from .models import Template, TemplateShare
from .widgets import QuillWidget


class TemplateShareInline(admin.TabularInline):
    model = TemplateShare
    extra = 1
    fields = ["shared_with", "shared_by", "created_at"]
    readonly_fields = ["shared_by", "created_at"]
    fk_name = "template"


class TemplateAdminForm(forms.ModelForm):
    class Meta:
        model = Template
        fields = "__all__"
        widgets = {"html": QuillWidget()}


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    form = TemplateAdminForm
    list_display = ["name", "visibility", "created_by", "updated_at"]
    list_filter = ["visibility"]
    search_fields = ["name", "html"]
    readonly_fields = ["created_by", "created_at", "updated_at"]
    inlines = [TemplateShareInline]

    actions = ["make_global", "make_shared", "make_personal"]

    def save_model(self, request, obj, form, change):
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for instance in instances:
            if isinstance(instance, TemplateShare) and not instance.pk:
                instance.shared_by = request.user
            instance.save()
        formset.save_m2m()

    @admin.action(description="Set visibility: global")
    def make_global(self, request, queryset):
        queryset.update(visibility=Template.GLOBAL)

    @admin.action(description="Set visibility: shared")
    def make_shared(self, request, queryset):
        queryset.update(visibility=Template.SHARED)

    @admin.action(description="Set visibility: personal")
    def make_personal(self, request, queryset):
        queryset.update(visibility=Template.PERSONAL)
