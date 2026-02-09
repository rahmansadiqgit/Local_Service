from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import ERP, Notification, Post, Product, Rating, Skill

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "name",
            "email",
            "phone",
            "profile_photo",
            "location",
            "education_skills",
            "experience",
            "status",
            "facebook_link",
            "whatsapp_link",
            "role",
        )

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "name",
            "email",
            "phone",
            "profile_photo",
            "location",
            "education_skills",
            "experience",
            "status",
            "facebook_link",
            "whatsapp_link",
            "role",
        )
        read_only_fields = ("id", "username", "email", "role")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        user = self.context["request"].user
        try:
            validate_password(value, user=user)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return value


class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = (
            "id",
            "post_type",
            "post_name",
            "brand_company_name",
            "location",
            "service_type",
            "image",
            "website_link",
        )


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = (
            "id",
            "post",
            "skill_name",
            "unit",
            "cost_per_unit",
            "available_workers",
        )


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = (
            "id",
            "post",
            "product_name",
            "unit",
            "cost_per_unit",
            "available_units",
        )


class ERPSerializer(serializers.ModelSerializer):
    class Meta:
        model = ERP
        fields = (
            "id",
            "category",
            "stage",
            "post",
            "provider",
            "assigned_workers",
            "total_cost",
            "pdf_slip",
        )


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = (
            "id",
            "post",
            "provider",
            "customer",
            "rating_value",
            "review_text",
        )
        read_only_fields = ("customer",)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "user", "title", "message", "is_read", "created_at")
        read_only_fields = ("created_at",)
