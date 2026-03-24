from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Connection, ERP, ERPMessage, Expertise, Notification, Post, ProblemReport, Product, Rating, Skill

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
            "supply_status",
            "demand_status",
            "facebook_link",
            "whatsapp_link",
        )
        extra_kwargs = {
            "email": {"required": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password")
        if not validated_data.get("username") and validated_data.get("email"):
            validated_data["username"] = validated_data["email"]
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def validate_whatsapp_link(self, value):
        raw = str(value or "").strip()
        if not raw:
            return ""
        digits_only = re.sub(r"\D", "", raw)
        if not digits_only:
            raise serializers.ValidationError("Enter a valid WhatsApp number.")
        return digits_only


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.EMAIL_FIELD
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop("username", None)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        if not email or not password:
            raise serializers.ValidationError("Email and password are required.")

        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        refresh = self.get_token(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }


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
            "supply_status",
            "demand_status",
            "facebook_link",
            "whatsapp_link",
        )
        read_only_fields = ("id", "username", "email")

    def validate_whatsapp_link(self, value):
        raw = str(value or "").strip()
        if not raw:
            return ""
        digits_only = re.sub(r"\D", "", raw)
        if not digits_only:
            raise serializers.ValidationError("Enter a valid WhatsApp number.")
        return digits_only


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
    owner_name = serializers.CharField(source="owner.name", read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    owner_status = serializers.CharField(source="owner.status", read_only=True)
    owner_profile_photo = serializers.ImageField(source="owner.profile_photo", read_only=True)
    owner_supply_status = serializers.CharField(source="owner.supply_status", read_only=True)
    owner_demand_status = serializers.CharField(source="owner.demand_status", read_only=True)

    class Meta:
        model = Post
        fields = (
            "id",
            "created_at",
            "owner_id",
            "owner_name",
            "owner_status",
            "owner_profile_photo",
            "owner_supply_status",
            "owner_demand_status",
            "post_type",
            "post_name",
            "post_title",
            "description",
            "brand_company_name",
            "location",
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
            "description",
            "unit",
            "cost_per_unit",
        )


class ExpertiseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expertise
        fields = (
            "id",
            "post",
            "name",
            "experience",
            "unit",
            "cost",
            "available_person",
        )


class ProductSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        unit = attrs.get("unit")

        if unit in (None, ""):
            if self.instance and self.instance.unit:
                attrs["unit"] = self.instance.unit
            else:
                attrs["unit"] = "quantity"

        return attrs

    class Meta:
        model = Product
        fields = (
            "id",
            "post",
            "product_name",
            "description",
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
            "receiver",
            "assigned_workers",
            "total_cost",
            "configuration_snapshot",
            "is_configured",
            "pdf_slip",
        )
        read_only_fields = ("provider", "receiver", "category")


class ERPMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField(read_only=True)
    sender_profile_photo = serializers.ImageField(source="sender.profile_photo", read_only=True)
    parent_id = serializers.IntegerField(source="parent.id", read_only=True)

    class Meta:
        model = ERPMessage
        fields = (
            "id",
            "erp",
            "sender",
            "sender_name",
            "sender_profile_photo",
            "message",
            "parent",
            "parent_id",
            "created_at",
        )
        read_only_fields = (
            "id",
            "erp",
            "sender",
            "sender_name",
            "sender_profile_photo",
            "parent_id",
            "created_at",
        )

    def get_sender_name(self, obj):
        return obj.sender.name or obj.sender.username or obj.sender.email


class ConnectionSerializer(serializers.ModelSerializer):
    requester_name = serializers.SerializerMethodField(read_only=True)
    addressee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Connection
        fields = (
            "id",
            "requester",
            "requester_name",
            "addressee",
            "addressee_name",
            "status",
            "request_message",
            "accepted_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "requester",
            "requester_name",
            "addressee_name",
            "accepted_at",
            "created_at",
            "updated_at",
        )

    def get_requester_name(self, obj):
        return obj.requester.name or obj.requester.username or obj.requester.email

    def get_addressee_name(self, obj):
        return obj.addressee.name or obj.addressee.username or obj.addressee.email


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


class ProblemReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProblemReport
        fields = (
            "id",
            "user",
            "subject",
            "details",
            "reporter_name",
            "reporter_email",
            "reporter_phone",
            "created_at",
        )
        read_only_fields = (
            "id",
            "user",
            "reporter_name",
            "reporter_email",
            "reporter_phone",
            "created_at",
        )




