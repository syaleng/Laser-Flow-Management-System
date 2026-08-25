from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.common.views import HealthCheckView
from apps.design_orders.views import PaymentListView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthCheckView.as_view(), name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/users/", include("apps.accounts.user_urls")),
    path("api/v1/customers/", include("apps.customers.urls")),
    path("api/v1/design-orders/", include("apps.design_orders.order_urls")),
    path("api/v1/design-categories/", include("apps.design_orders.category_urls")),
    path("api/v1/journal/", include("apps.daily_journal.urls")),
    path("api/v1/payments/", PaymentListView.as_view(), name="payments"),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
