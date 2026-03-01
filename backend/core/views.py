from io import BytesIO

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.db.models import Avg, DecimalField, Max, Min
from django.db.models.functions import Coalesce
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .models import ERP, Notification, Post, Product, Rating, Skill
from .serializers import (
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    ERPSerializer,
    NotificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PostSerializer,
    ProductSerializer,
    RatingSerializer,
    SkillSerializer,
    UserRegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "Refresh token is required."}, status=400)
        token = RefreshToken(refresh)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"detail": "Old password is incorrect."}, status=400)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password changed."})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_URL}/reset-password/confirm?uid={uid}&token={token}"
            )
            send_mail(
                subject="Reset your Localix password",
                message=f"Reset your password using this link: {reset_url}",
                from_email=None,
                recipient_list=[email],
                fail_silently=True,
            )
        return Response({"detail": "If the email exists, a reset link was sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Invalid token."}, status=400)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid token."}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password reset successful."})
"""
ModelViewSet automatically gives you:

list() → GET all
retrieve() → GET single
create() → POST
update() → PUT
partial_update() → PATCH
destroy() → DELETE
So you don’t write those manually.

"""

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    #Anyone can read (GET) Only logged-in users can POST, PUT, DELETE
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ["post_name", "brand_company_name", "location"]
    ordering_fields = ["post_name", "location"]

    def get_queryset(self):
        queryset = ( # A SQL query builder object
            Post.objects.all()
            .annotate(
                avg_rating=Avg("ratings__rating_value"),
                min_skill_cost=Min("skills__cost_per_unit"),
                min_product_cost=Min("products__cost_per_unit"),
                max_skill_cost=Max("skills__cost_per_unit"),
                max_product_cost=Max("products__cost_per_unit"),
            )
            .annotate(
                min_cost=Coalesce( # Coalesce means: Give me the first non-null value from these fields
                    "min_skill_cost",
                    "min_product_cost",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                max_cost=Coalesce(
                    "max_skill_cost",
                    "max_product_cost",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
            )
        ) # And they are calculated at database level (not Python).
        
        post_type = self.request.query_params.get("type")
        location = self.request.query_params.get("location")
        service_type = self.request.query_params.get("service_type")
        min_cost = self.request.query_params.get("min_cost")
        max_cost = self.request.query_params.get("max_cost")
        rating = self.request.query_params.get("rating")
        mine = self.request.query_params.get("mine")

        if post_type:
            queryset = queryset.filter(post_type=post_type)
        if location:
            queryset = queryset.filter(location__icontains=location)
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        if min_cost:
            queryset = queryset.filter(min_cost__gte=min_cost)
        if max_cost:
            queryset = queryset.filter(max_cost__lte=max_cost)
        if rating:
            queryset = queryset.filter(avg_rating__gte=rating)
        if mine and self.request.user.is_authenticated:
            queryset = queryset.filter(owner=self.request.user)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all() 
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["post"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all() # From GenericAPIView
    serializer_class = ProductSerializer # From GenericAPIView
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # APIView
    filterset_fields = ["post"] # Used by DjangoFilterBackend


class ERPViewSet(viewsets.ModelViewSet):
    queryset = ERP.objects.all()
    serializer_class = ERPSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["patch"])
    def update_stage(self, request, pk=None):
        erp = self.get_object()
        stage = request.data.get("stage")
        if not stage:
            return Response({"detail": "Stage is required."}, status=400)
        erp.stage = stage
        erp.save()
        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def assign_workers(self, request, pk=None):
        erp = self.get_object()
        worker_ids = request.data.get("worker_ids", [])
        if not isinstance(worker_ids, list):
            return Response({"detail": "worker_ids must be a list."}, status=400)
        erp.assigned_workers.set(User.objects.filter(id__in=worker_ids))
        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def generate_pdf(self, request, pk=None):
        erp = self.get_object()
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setTitle("ERP Slip")
        pdf.drawString(50, 800, "Localix ERP Slip")
        pdf.drawString(50, 770, f"Post: {erp.post.post_name}")
        pdf.drawString(50, 750, f"Category: {erp.category}")
        pdf.drawString(50, 730, f"Stage: {erp.stage}")
        pdf.drawString(50, 710, f"Total Cost: {erp.total_cost}")
        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        erp.pdf_slip.save(f"erp_{erp.id}.pdf", ContentFile(buffer.read()), save=True)
        return Response(self.get_serializer(erp).data)


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["post", "provider"]

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.customer != self.request.user:
            raise PermissionDenied("Only the customer can update this rating.")
        serializer.save()


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.all().order_by("id")
