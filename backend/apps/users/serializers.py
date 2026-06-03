from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    """Validates the email-only login payload (format only, not existence)."""

    email = serializers.EmailField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "is_manager", "last_seen"]
        read_only_fields = fields
