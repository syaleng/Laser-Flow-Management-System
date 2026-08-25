from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.authorization import Capability
from apps.accounts.permissions import HasRequiredCapability

from .serializers import ReportFilterSerializer
from .services import build_report


class FinancialReportView(APIView):
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.VIEW_REPORTS

    @extend_schema(parameters=[ReportFilterSerializer], responses=OpenApiTypes.OBJECT)
    def get(self, request):
        serializer = ReportFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return Response({"data": build_report(serializer.validated_data)})
