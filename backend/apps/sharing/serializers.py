from rest_framework import serializers

from apps.templates.models import Template
from apps.users.models import User

from .models import SharedResponse


class SharedResponseSerializer(serializers.ModelSerializer):
    """
    Create a shared response.

    The client supplies `recipient_email`, `resolved_text`, and an optional
    `template` id. The recipient must be a known user (else 400). The sender is
    taken from the request, never the payload.
    """

    recipient_email = serializers.EmailField(write_only=True)
    recipient = serializers.EmailField(source="recipient.email", read_only=True)
    sender = serializers.EmailField(source="sender.email", read_only=True)

    class Meta:
        model = SharedResponse
        fields = [
            "id",
            "resolved_text",
            "template",
            "recipient_email",
            "recipient",
            "sender",
            "created_at",
        ]
        read_only_fields = ["id", "recipient", "sender", "created_at"]
        extra_kwargs = {
            "template": {"required": False, "allow_null": True,
                         "queryset": Template.objects.all()},
        }

    def validate_recipient_email(self, value):
        try:
            self._recipient = User.objects.get(email__iexact=value, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user exists with that email.")
        return value

    def create(self, validated_data):
        validated_data.pop("recipient_email", None)
        return SharedResponse.objects.create(
            sender=self.context["request"].user,
            recipient=self._recipient,
            **validated_data,
        )
