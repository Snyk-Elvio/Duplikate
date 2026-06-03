from rest_framework import mixins, viewsets

from .models import SharedResponse
from .serializers import SharedResponseSerializer


class SharedResponseViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Shared responses.

    - POST creates an immutable snapshot (no update/delete endpoints).
    - GET lists shares the current user sent or received.
    """

    serializer_class = SharedResponseSerializer

    def get_queryset(self):
        user = self.request.user
        return SharedResponse.objects.filter(sender=user) | SharedResponse.objects.filter(
            recipient=user
        )
