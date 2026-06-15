from django.conf import settings
from django.db import models


class Template(models.Model):
    """
    A canned response stored as raw HTML containing {{PLACEHOLDERS}}.

    Placeholders are resolved client-side (in the extension) at copy time, so the
    DB only ever stores the raw, unresolved HTML.

    Visibility controls who can see and edit:
    - personal: only the creator
    - shared: creator + explicitly granted users (via TemplateShare)
    - global: all authenticated users; only is_staff may write
    """

    PERSONAL = "personal"
    SHARED = "shared"
    GLOBAL = "global"
    VISIBILITY_CHOICES = [
        (PERSONAL, "Personal"),
        (SHARED, "Shared"),
        (GLOBAL, "Global"),
    ]

    name = models.CharField(max_length=200)
    html = models.TextField(
        help_text="Raw HTML. Supported placeholders: "
        "{{CUSTOMER_FULL_NAME}}, {{CUSTOMER_FIRST_NAME}}, {{CASE_NUMBER}}",
    )
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default=GLOBAL,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.visibility})"


class TemplateShare(models.Model):
    """Grants a specific user read access to a shared template."""

    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name="visibility_shares",
    )
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="template_shares",
    )
    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="templates_shared_by_me",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("template", "shared_with")]

    def __str__(self) -> str:
        return f"{self.template.name} → {self.shared_with}"
