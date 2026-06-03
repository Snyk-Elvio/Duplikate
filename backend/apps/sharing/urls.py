from rest_framework.routers import DefaultRouter

from .views import SharedResponseViewSet

router = DefaultRouter()
router.register(r"shares", SharedResponseViewSet, basename="share")

urlpatterns = router.urls
