from django.conf import settings
from django.db import models


class SharedResponse(models.Model):
    """
    An immutable snapshot of a resolved response shared from one engineer to
    another by email.

    `resolved_text` is captured at share time and never changes — editing the
    originating template does not affect already-shared copies. The template FK
    is kept for provenance only (and nulled if the template is later deleted).
    """

    resolved_text = models.TextField(
        help_text="Snapshot of the fully-resolved response at the moment of sharing.",
    )
    template = models.ForeignKey(
        "templates.Template",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shares",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_shares",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_shares",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.sender} → {self.recipient} @ {self.created_at:%Y-%m-%d %H:%M}"
