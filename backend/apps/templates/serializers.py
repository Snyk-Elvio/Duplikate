from rest_framework import serializers

from .models import Template, TemplateShare


class TemplateShareSerializer(serializers.ModelSerializer):
    shared_with_email = serializers.EmailField(source="shared_with.email", read_only=True)

    class Meta:
        model = TemplateShare
        fields = ["id", "shared_with", "shared_with_email", "shared_by", "created_at"]
        read_only_fields = ["id", "shared_by", "created_at"]


class TemplateSerializer(serializers.ModelSerializer):
    visibility_shares = TemplateShareSerializer(many=True, read_only=True)

    class Meta:
        model = Template
        fields = [
            "id",
            "name",
            "html",
            "visibility",
            "created_by",
            "created_at",
            "updated_at",
            "visibility_shares",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]
