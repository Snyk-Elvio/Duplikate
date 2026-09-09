from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import Template, TemplateShare
from .permissions import TemplatePermission
from .serializers import TemplateSerializer, TemplateShareSerializer


class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSerializer
    permission_classes = [TemplatePermission]

    def get_queryset(self):
        user = self.request.user
        return Template.objects.filter(
            Q(visibility=Template.GLOBAL)
            | Q(visibility=Template.PERSONAL, created_by=user)
            | Q(visibility=Template.SHARED, created_by=user)
            | Q(visibility=Template.SHARED, visibility_shares__shared_with=user)
        ).distinct()

    def perform_create(self, serializer):
        visibility = serializer.validated_data.get("visibility", Template.GLOBAL)
        if visibility == Template.GLOBAL and not self.request.user.is_staff:
            raise PermissionDenied("Only staff can create global templates.")
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="share")
    def share(self, request, pk=None):
        template = self.get_object()
        if template.visibility != Template.SHARED:
            raise ValidationError("Only shared templates can be granted to specific users.")
        if template.created_by != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the template creator can share it.")
        serializer = TemplateShareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        share, _ = TemplateShare.objects.get_or_create(
            template=template,
            shared_with=serializer.validated_data["shared_with"],
            defaults={"shared_by": request.user},
        )
        return Response(TemplateShareSerializer(share).data, status=201)
