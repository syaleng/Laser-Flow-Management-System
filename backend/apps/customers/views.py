from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.authorization import Capability
from apps.accounts.permissions import HasRequiredCapability

from . import selectors, services
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_CUSTOMERS
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return selectors.customer_list(params=self.request.query_params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            {"data": self.get_serializer(customer).data},
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, *args, **kwargs):
        return Response({"data": self.get_serializer(self.get_object()).data})

    def partial_update(self, request, *args, **kwargs):
        customer = self.get_object()
        serializer = self.get_serializer(customer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response({"data": self.get_serializer(customer).data})

    @extend_schema(request=None, responses={200: CustomerSerializer})
    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        customer = services.archive_customer(customer=self.get_object())
        return Response({"data": self.get_serializer(customer).data})

    @extend_schema(request=None, responses={200: CustomerSerializer})
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        customer = services.restore_customer(customer=self.get_object())
        return Response({"data": self.get_serializer(customer).data})
