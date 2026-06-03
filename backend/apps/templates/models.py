from django.conf import settings
from django.db import models


class Template(models.Model):
    """
    A canned response stored as raw HTML containing {{PLACEHOLDERS}}.

    Placeholders are resolved client-side (in the extension) at copy time, so the
    DB only ever stores the raw, unresolved HTML. Managers author templates;
    engineers see only published ones.
    """

    name = models.CharField(max_length=200)
    html = models.TextField(
        help_text="Raw HTML. Supported placeholders: "
        "{{CUSTOMER_FULL_NAME}}, {{CUSTOMER_FIRST_NAME}}, {{CASE_NUMBER}}",
    )
    is_published = models.BooleanField(default=False)

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
        state = "published" if self.is_published else "draft"
        return f"{self.name} ({state})"
