from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DailyClosingListView,
    ExpenseViewSet,
    JournalActivityListView,
    MoneyLoanViewSet,
    PayableAccountViewSet,
    close_day,
    dashboard,
    journal_report,
    journal_summary,
)

router = DefaultRouter()
router.register("expenses", ExpenseViewSet, basename="journal-expense")
router.register("loans", MoneyLoanViewSet, basename="journal-loan")
router.register("payables", PayableAccountViewSet, basename="journal-payable")

urlpatterns = [
    path("dashboard/", dashboard, name="dashboard"),
    path("summary/", journal_summary, name="journal-summary"),
    path("reports/", journal_report, name="journal-reports"),
    path("close/", close_day, name="journal-close"),
    path("closings/", DailyClosingListView.as_view(), name="journal-closings"),
    path("activities/", JournalActivityListView.as_view(), name="journal-activities"),
    path("", include(router.urls)),
]
