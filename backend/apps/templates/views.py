from rest_framework import viewsets

from .models import Template
from .permissions import IsManagerOrReadOnly
from .serializers import TemplateSerializer


class TemplateViewSet(viewsets.ModelViewSet):
    """
    Templates API.

    - Managers see all templates; engineers see published only.
    - Only managers may create/update/delete (enforced by IsManagerOrReadOnly).
    """

    serializer_class = TemplateSerializer
    permission_classes = [IsManagerOrReadOnly]

    def get_queryset(self):
        qs = Template.objects.all()
        user = self.request.user
        if not getattr(user, "is_manager", False):
            qs = qs.filter(is_published=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
