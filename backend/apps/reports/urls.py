from django.urls import path

from .views import FinancialReportView

urlpatterns = [path("", FinancialReportView.as_view(), name="financial-report")]
