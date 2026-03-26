from io import BytesIO
import textwrap

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.db.models import Avg, DecimalField, Max, Min
from django.db.models import Q
from django.db.models.functions import Coalesce
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from .models import ERP, ERPMessage, Expertise, Notification, Post, ProblemReport, Product, Rating, Skill
from .serializers import (
    ChangePasswordSerializer,
    EmailTokenObtainPairSerializer,
    ExpertiseSerializer,
    ERPSerializer,
    ERPMessageSerializer,
    NotificationSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PostSerializer,
    ProblemReportSerializer,
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

        Notification.objects.create(
            user=user,
            title="Password Changed",
            message="You have changed your password.",
        )

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

        Notification.objects.create(
            user=user,
            title="Password Changed",
            message="You have changed your password.",
        )

        return Response({"detail": "Password reset successful."})


class ReportProblemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subject = str(request.data.get("subject", "")).strip()
        details = str(request.data.get("details", "")).strip()

        if not subject or not details:
            return Response(
                {"detail": "Both subject and details are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_label = request.user.get_full_name() or request.user.username
        user_email = str(request.user.email or "").strip()
        if not user_email:
            return Response(
                {"detail": "Your account must have an email to submit a report."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = ProblemReport.objects.create(
            user=request.user,
            subject=subject,
            details=details,
            reporter_name=(request.user.name or user_label),
            reporter_email=user_email,
            reporter_phone=str(request.user.phone or "").strip(),
        )

        serializer = ProblemReportSerializer(report)
        return Response(
            {
                "detail": "Report submitted successfully.",
                "report": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
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
        min_cost = self.request.query_params.get("min_cost")
        max_cost = self.request.query_params.get("max_cost")
        rating = self.request.query_params.get("rating")
        mine = self.request.query_params.get("mine")

        if post_type:
            queryset = queryset.filter(post_type=post_type)
        if location:
            queryset = queryset.filter(location__icontains=location)
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
        post = serializer.save(owner=self.request.user)
        post_title = (post.post_title or "").strip() or "Untitled Post"
        Notification.objects.create(
            user=self.request.user,
            title="Post Created",
            message=f"You have successfully created your post: {post_title}.",
        )


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all() 
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["post"]


class ExpertiseViewSet(viewsets.ModelViewSet):
    queryset = Expertise.objects.all()
    serializer_class = ExpertiseSerializer
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

    def _resolve_roles(self, actor, post):
        owner = post.owner

        if post.post_type == "Demand":
            provider = actor
            receiver = owner
        else:
            provider = owner
            receiver = actor if owner and actor != owner else None

        if provider is None and receiver is None:
            raise ValidationError({"detail": "Cannot assign ERP roles for this post."})

        category = "Provided" if actor == provider else "Received"
        return provider, receiver, category

    def _to_bool(self, value):
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in {"1", "true", "yes", "on"}

    def _notify_booking_confirmation(self, erp, actor):
        if not erp:
            return

        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or "a post"
        )
        actor_name = getattr(actor, "name", "") or getattr(actor, "username", "") or "A user"

        supplier = getattr(erp.post, "owner", None)
        if not supplier:
            return

        Notification.objects.create(
            user=supplier,
            title="Booking Confirmed",
            message=f"{actor_name} confirmed booking for '{post_title}'. Check ERP for task details.",
        )

    def get_queryset(self):
        user = self.request.user
        return ERP.objects.filter(
            Q(provider=user) | Q(receiver=user) | Q(post__owner=user) | Q(assigned_workers=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        actor = request.user
        post = serializer.validated_data.get("post")

        if not post:
            raise ValidationError({"post": "Post is required."})

        provider, receiver, category = self._resolve_roles(actor, post)

        existing = (
            ERP.objects.filter(post=post, provider=provider, receiver=receiver)
            .order_by("-updated_at", "-id")
            .first()
        )

        if existing:
            data = self.get_serializer(existing).data
            return Response(data, status=status.HTTP_200_OK)

        instance = serializer.save(provider=provider, receiver=receiver, category=category)
        if self._to_bool(serializer.validated_data.get("is_configured", False)):
            self._notify_booking_confirmation(instance, actor)
        data = self.get_serializer(instance).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        if self._to_bool(request.data.get("is_configured", False)):
            self._notify_booking_confirmation(self.get_object(), request.user)
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if self._to_bool(request.data.get("is_configured", False)):
            self._notify_booking_confirmation(self.get_object(), request.user)
        return response

    def perform_create(self, serializer):
        actor = self.request.user
        post = serializer.validated_data.get("post")

        if not post:
            raise ValidationError({"post": "Post is required."})

        provider, receiver, category = self._resolve_roles(actor, post)

        serializer.save(provider=provider, receiver=receiver, category=category)

    def _allowed_member_roles(self):
        return {"expertise", "skill_provider", "supplier"}

    def _get_member_bucket(self, erp, role):
        snapshot = erp.configuration_snapshot or {}
        members = snapshot.get("members") or {}

        role_bucket = members.get(role) or {}
        existing_ids = role_bucket.get("assignee_ids") or []
        assignee_ids = []
        for raw_id in existing_ids:
            try:
                assignee_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        role_bucket = {
            "assignee_ids": sorted(list(set(assignee_ids))),
            "self_assign_enabled": bool(role_bucket.get("self_assign_enabled", False)),
        }
        members[role] = role_bucket
        snapshot["members"] = members
        return snapshot, members, role_bucket

    def _save_snapshot(self, erp, snapshot):
        erp.configuration_snapshot = snapshot
        erp.save(update_fields=["configuration_snapshot", "updated_at"])

    @action(detail=True, methods=["get", "patch"])
    def members(self, request, pk=None):
        erp = self.get_object()

        if request.method.lower() == "get":
            snapshot = erp.configuration_snapshot or {}
            members = snapshot.get("members") or {}
            response = {}
            for role in self._allowed_member_roles():
                role_bucket = members.get(role) or {}
                assignee_ids = role_bucket.get("assignee_ids") or []
                response[role] = {
                    "assignee_ids": [int(uid) for uid in assignee_ids if str(uid).isdigit()],
                    "self_assign_enabled": bool(role_bucket.get("self_assign_enabled", False)),
                }
            return Response(response)

        if not erp.provider or erp.provider.id != request.user.id:
            raise PermissionDenied("Only provider can manage member assignments.")

        role = str(request.data.get("role", "")).strip().lower()
        if role not in self._allowed_member_roles():
            return Response({"detail": "Invalid member role."}, status=status.HTTP_400_BAD_REQUEST)

        mode = str(request.data.get("mode", "set")).strip().lower()
        if mode not in {"set", "add", "remove"}:
            return Response({"detail": "Invalid mode."}, status=status.HTTP_400_BAD_REQUEST)

        incoming_ids = request.data.get("assignee_ids", [])
        if not isinstance(incoming_ids, list):
            return Response({"detail": "assignee_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        clean_ids = []
        for raw_id in incoming_ids:
            try:
                clean_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        valid_ids = set(User.objects.filter(id__in=clean_ids).values_list("id", flat=True))

        snapshot, members, role_bucket = self._get_member_bucket(erp, role)
        existing = set(role_bucket.get("assignee_ids") or [])

        if mode == "set":
            updated = valid_ids
        elif mode == "add":
            updated = existing.union(valid_ids)
        else:
            updated = existing.difference(valid_ids)

        role_bucket["assignee_ids"] = sorted(list(updated))
        members[role] = role_bucket
        snapshot["members"] = members
        self._save_snapshot(erp, snapshot)

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def publish_member_post(self, request, pk=None):
        erp = self.get_object()

        if not erp.provider or erp.provider.id != request.user.id:
            raise PermissionDenied("Only provider can publish member assignment posts.")

        role = str(request.data.get("role", "")).strip().lower()
        if role not in self._allowed_member_roles():
            return Response({"detail": "Invalid member role."}, status=status.HTTP_400_BAD_REQUEST)

        snapshot, members, role_bucket = self._get_member_bucket(erp, role)
        role_bucket["self_assign_enabled"] = True
        members[role] = role_bucket
        snapshot["members"] = members
        self._save_snapshot(erp, snapshot)

        role_title = role.replace("_", " ").title()
        receivers = User.objects.exclude(id=request.user.id)
        notifications = [
            Notification(
                user=target,
                title=f"ERP Self-Assign Open: {role_title}",
                message=f"ERP #{erp.id} is open for self-assignment as {role_title}. Visit Connections to assign yourself.",
            )
            for target in receivers
        ]
        if notifications:
            Notification.objects.bulk_create(notifications)

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def self_assign(self, request, pk=None):
        erp = self.get_object()
        role = str(request.data.get("role", "")).strip().lower()
        if role not in self._allowed_member_roles():
            return Response({"detail": "Invalid member role."}, status=status.HTTP_400_BAD_REQUEST)

        snapshot, members, role_bucket = self._get_member_bucket(erp, role)
        if not role_bucket.get("self_assign_enabled"):
            return Response(
                {"detail": "Self-assignment is not enabled for this role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assign = request.data.get("assign", True)
        should_assign = bool(assign)

        ids = set(role_bucket.get("assignee_ids") or [])
        if should_assign:
            ids.add(request.user.id)
        else:
            ids.discard(request.user.id)

        role_bucket["assignee_ids"] = sorted(list(ids))
        members[role] = role_bucket
        snapshot["members"] = members
        self._save_snapshot(erp, snapshot)

        return Response(self.get_serializer(erp).data)

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

        def user_label(user):
            if not user:
                return "N/A"
            display = user.name or user.username or user.email or f"User #{user.id}"
            return f"{display} (id:{user.id})"

        def as_text(value):
            if value is None or value == "":
                return "-"
            return str(value)

        def as_money(value):
            try:
                return f"${float(value):.2f}"
            except (TypeError, ValueError):
                return "$0.00"

        post = erp.post
        owner = post.owner if post else None
        provider = erp.provider
        receiver = erp.receiver
        actor = request.user
        snapshot = erp.configuration_snapshot or {}
        snapshot_post = snapshot.get("post") or {}
        snapshot_expertise = snapshot.get("expertise") or []
        snapshot_services = snapshot.get("services") or []
        snapshot_products = snapshot.get("products") or []
        snapshot_totals = snapshot.get("totals") or {}

        post_rating = (
            Rating.objects.filter(post=post).aggregate(avg=Avg("rating_value")).get("avg")
            if post
            else 0
        ) or 0

        viewer_role = "Viewer"
        if provider and actor and provider.id == actor.id:
            viewer_role = "Provider"
        elif receiver and actor and receiver.id == actor.id:
            viewer_role = "Receiver"

        role_label = "Providing" if viewer_role == "Provider" else "Receiving" if viewer_role == "Receiver" else erp.category

        has_workers = erp.assigned_workers.exists()
        has_pdf_slip = bool(erp.pdf_slip)
        has_total_cost = float(erp.total_cost or 0) > 0
        has_linked_post = bool(erp.post_id)

        tracking_tasks = {
            "Pending": [
                ("Post linked to ERP task", has_linked_post),
                ("Assign at least one worker", has_workers),
            ],
            "On Process": [
                ("Generate PDF slip", has_pdf_slip),
                ("Set final total cost", has_total_cost),
            ],
            "Completed": [
                ("Process completed", erp.stage == "Completed"),
            ],
        }

        assigned_workers = [user_label(worker) for worker in erp.assigned_workers.all()]

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setTitle(f"ERP Slip #{erp.id}")

        page_width, page_height = A4
        left = 42
        right = page_width - 42
        top = page_height - 42
        bottom = 50
        line_height = 13
        y = top

        def new_page():
            nonlocal y
            pdf.showPage()
            y = top

        def ensure_space(required_height):
            nonlocal y
            if y - required_height < bottom:
                new_page()

        def draw_title(title, subtitle=""):
            nonlocal y
            ensure_space(36)
            pdf.setFont("Helvetica-Bold", 16)
            pdf.drawString(left, y, title)
            y -= 18
            if subtitle:
                pdf.setFont("Helvetica", 9)
                pdf.drawString(left, y, subtitle)
                y -= 14

        def draw_section(title):
            nonlocal y
            ensure_space(20)
            y -= 2
            pdf.setFont("Helvetica-Bold", 12)
            pdf.drawString(left, y, title)
            y -= 8
            pdf.line(left, y, right, y)
            y -= 12

        def draw_kv(key, value, wrap=78):
            nonlocal y
            wrapped = textwrap.wrap(as_text(value), width=wrap) or ["-"]
            needed = max(line_height * len(wrapped), line_height)
            ensure_space(needed + 2)
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(left, y, f"{key}:")
            pdf.setFont("Helvetica", 9)
            value_x = left + 140
            current_y = y
            for line in wrapped:
                pdf.drawString(value_x, current_y, line)
                current_y -= line_height
            y = current_y

        def draw_table(title, rows):
            nonlocal y
            if not rows:
                return

            draw_section(title)
            if "Expertise" in title:
                headers = ["Name", "Duration", "Unit", "Unit Cost", "People", "Line Total"]
                values_builder = lambda row: [
                    as_text(row.get("name") or "-"),
                    as_text(row.get("duration", 0)),
                    as_text(row.get("unit") or "-"),
                    as_money(row.get("unit_cost", 0)),
                    as_text(row.get("quantity", 0)),
                    as_money(row.get("line_total", 0)),
                ]
            elif "Services" in title:
                headers = ["Name", "Duration", "Unit", "Unit Cost", "Packages", "Line Total"]
                values_builder = lambda row: [
                    as_text(row.get("name") or "-"),
                    as_text(row.get("duration", 0)),
                    as_text(row.get("unit") or "-"),
                    as_money(row.get("unit_cost", 0)),
                    as_text(row.get("quantity", 0)),
                    as_money(row.get("line_total", 0)),
                ]
            else:
                headers = ["Name", "Unit", "Qty", "Unit Cost", "Line Total"]
                values_builder = lambda row: [
                    as_text(row.get("name") or "-"),
                    as_text(row.get("unit") or "-"),
                    as_text(row.get("quantity", 0)),
                    as_money(row.get("unit_cost", 0)),
                    as_money(row.get("line_total", 0)),
                ]

            col_x = [left, left + 155, left + 235, left + 315, left + 390, left + 465][: len(headers)]

            def draw_header():
                nonlocal y
                ensure_space(18)
                pdf.setFont("Helvetica-Bold", 8)
                for idx, header in enumerate(headers):
                    pdf.drawString(col_x[idx], y, header)
                y -= 10
                pdf.line(left, y, right, y)
                y -= 10

            draw_header()
            for row in rows:
                ensure_space(14)
                pdf.setFont("Helvetica", 8)
                values = values_builder(row)
                for idx, val in enumerate(values):
                    cell = val[:26]
                    pdf.drawString(col_x[idx], y, cell)
                y -= 11
            y -= 2

        draw_title(
            f"Localix ERP Slip #{erp.id}",
            f"Generated by: {user_label(actor)}   |   Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )

        draw_section("Card Information")
        draw_kv("Role", role_label)
        draw_kv("Category", erp.category)
        draw_kv("Current Stage", erp.stage)
        draw_kv("Post Name", post.post_name if post else "-")
        draw_kv("Location", post.location if post else "-")
        draw_kv("Provider", user_label(provider))
        draw_kv("Receiver", user_label(receiver))
        draw_kv("Rating", f"{float(post_rating):.2f}")
        draw_kv("Total Cost", as_money(erp.total_cost))

        draw_section("Tracking Information")
        draw_kv("State Flow", "Pending -> On Process -> Completed")
        draw_kv("Active State", erp.stage)
        for phase, tasks in tracking_tasks.items():
            status_lines = [f"{'DONE' if done else 'PENDING'} - {label}" for label, done in tasks]
            draw_kv(f"{phase} Tasks", " | ".join(status_lines), wrap=88)

        draw_section("View Details - Post")
        draw_kv("Title", snapshot_post.get("title") or getattr(post, "post_title", "-") or "-")
        draw_kv("Type", snapshot_post.get("type") or (post.post_type if post else "-"))
        draw_kv("Name", snapshot_post.get("name") or (post.post_name if post else "-"))
        draw_kv("Location", snapshot_post.get("location") or (post.location if post else "-"))
        draw_kv("Brand / Company", snapshot_post.get("brand_company_name") or (post.brand_company_name if post else "-"))
        draw_kv("Website", snapshot_post.get("website_link") or (post.website_link if post else "-"))
        draw_kv("Description", snapshot_post.get("description") or (post.description if post else "-"), wrap=90)
        draw_kv("Assigned Workers Count", len(assigned_workers))
        draw_kv("Assigned Workers", ", ".join(assigned_workers) if assigned_workers else "None", wrap=90)

        draw_section("View Details - Final Cost Summary")
        draw_kv("Expertise Total", as_money(snapshot_totals.get("expertise", 0)))
        draw_kv("Services Total", as_money(snapshot_totals.get("services", 0)))
        draw_kv("Products Total", as_money(snapshot_totals.get("products", 0)))
        draw_kv("Grand Total", as_money(snapshot_totals.get("grand", erp.total_cost)))

        draw_table("View Details - Expertise", snapshot_expertise)
        draw_table("View Details - Services", snapshot_services)
        draw_table("View Details - Products", snapshot_products)

        if not snapshot_expertise and not snapshot_services and not snapshot_products:
            draw_section("View Details - Item Tables")
            draw_kv("Info", "No finalized item rows found in configuration snapshot.")

        pdf.save()
        buffer.seek(0)
        erp.pdf_slip.save(f"erp_{erp.id}.pdf", ContentFile(buffer.read()), save=True)
        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        erp = self.get_object()

        if request.method.lower() == "get":
            queryset = ERPMessage.objects.filter(erp=erp).select_related("sender", "parent")
            serializer = ERPMessageSerializer(queryset, many=True)
            return Response(serializer.data)

        if erp.stage != "On Process":
            return Response(
                {"detail": "Messaging is available only in On Process state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message_text = str(request.data.get("message", "")).strip()
        if not message_text:
            return Response({"detail": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        parent = None
        parent_id = request.data.get("parent")
        if parent_id is not None and str(parent_id).strip() != "":
            parent = ERPMessage.objects.filter(id=parent_id, erp=erp).first()
            if parent is None:
                return Response(
                    {"detail": "Invalid reply target for this ERP thread."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        instance = ERPMessage.objects.create(
            erp=erp,
            sender=request.user,
            message=message_text,
            parent=parent,
        )
        serializer = ERPMessageSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
