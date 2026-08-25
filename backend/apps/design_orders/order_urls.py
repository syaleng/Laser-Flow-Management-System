from rest_framework.routers import DefaultRouter

from .views import DesignOrderViewSet

router = DefaultRouter()
router.register("", DesignOrderViewSet, basename="design-order")
urlpatterns = router.urls
