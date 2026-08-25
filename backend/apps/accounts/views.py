from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import services
from .authorization import Capability
from .models import LoginActivity, User
from .permissions import HasRequiredCapability
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

REFRESH_COOKIE_NAME = "laserflow_refresh"


def set_refresh_cookie(response: Response, refresh: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Strict",
        path="/api/v1/auth/",
    )


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        username = str(request.data.get("email", "")).strip().lower()[:254]
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError:
            attempted_user = User.objects.filter(email__iexact=username).only("id", "role").first()
            self._record_activity(request, username, attempted_user, successful=False)
            raise
        payload = serializer.validated_data
        authenticated_user = User.objects.only("id", "role").get(email__iexact=username)
        self._record_activity(request, username, authenticated_user, successful=True)
        response = Response(
            {"data": {"access": payload["access"], "user": payload["user"]}},
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, payload["refresh"])
        return response

    @staticmethod
    def _record_activity(request, username, user, *, successful):
        LoginActivity.objects.create(
            user=user,
            username=username,
            successful=successful,
            user_role=user.role if user else "",
            ip_address=request.META.get("REMOTE_ADDR") or None,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        )


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh:
            raise InvalidToken("Refresh cookie is missing.")

        serializer = self.get_serializer(data={"refresh": refresh})
        serializer.is_valid(raise_exception=True)
        response = Response(
            {"data": {"access": serializer.validated_data["access"]}},
            status=status.HTTP_200_OK,
        )
        if rotated_refresh := serializer.validated_data.get("refresh"):
            set_refresh_cookie(response, rotated_refresh)
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/v1/auth/", samesite="Strict")
        return response


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        return Response({"data": UserSerializer(request.user).data})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={204: None})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [HasRequiredCapability]
    required_capability = Capability.MANAGE_USERS
    search_fields = ["email", "full_name", "phone"]
    ordering_fields = ["full_name", "email", "created_at"]
    ordering = ["full_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in {"update", "partial_update"}:
            return UserUpdateSerializer
        return UserSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = services.set_user_active(user=self.get_object(), is_active=True, actor=request.user)
        return Response({"data": UserSerializer(user).data})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        try:
            user = services.set_user_active(
                user=self.get_object(), is_active=False, actor=request.user
            )
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        return Response({"data": UserSerializer(user).data})
