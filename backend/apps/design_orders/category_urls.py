from rest_framework.routers import DefaultRouter

from .views import DesignCategoryViewSet

router = DefaultRouter()
router.register("", DesignCategoryViewSet, basename="design-category")
urlpatterns = router.urls
