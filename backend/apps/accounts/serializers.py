from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from . import services
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "role",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_email(self, value):
        return User.objects.normalize_email(value).lower()


class UserCreateSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("password",)

    def create(self, validated_data):
        try:
            return services.create_user(data=validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


class UserUpdateSerializer(UserSerializer):
    def update(self, instance, validated_data):
        try:
            return services.update_user(
                user=instance,
                data=validated_data,
                actor=self.context["request"].user,
            )
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("The current password is incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value

    def save(self, **kwargs):
        services.change_password(
            user=self.context["request"].user,
            new_password=self.validated_data["new_password"],
        )


class LoginSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        email = attrs.get(self.username_field, "").lower()
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.", code="authorization")

        attrs[self.username_field] = email
        token_data = super().validate(attrs)
        return {
            "access": token_data["access"],
            "refresh": token_data["refresh"],
            "user": UserSerializer(user).data,
        }
