from io import BytesIO
import textwrap
import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import BadHeaderError
from django.core.mail import EmailMultiAlternatives
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

from .models import Connection, ConnectionRole, ConnectionStatus, ERP, ERPMessage, Expertise, Notification, Post, ProblemReport, Product, Rating, Skill
from .serializers import (
    ChangePasswordSerializer,
    ConnectionSerializer,
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
logger = logging.getLogger(__name__)


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
        input_email = serializer.validated_data["email"].strip()
        user = User.objects.filter(email__iexact=input_email, is_active=True).first()
        if not user:
            return Response(
                {
                    "detail": "This mail is not registered in the system yet. Enter a valid email."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = (
            f"{settings.FRONTEND_URL}/reset-password/confirm?uid={uid}&token={token}"
        )
        subject = "Reset your Localix password"
        text_body = (
            "You requested a password reset for your Localix account.\n\n"
            f"Click this link to set a new password:\n{reset_url}\n\n"
            "If you did not request this, you can ignore this email."
        )
        html_body = (
            "<p>You requested a password reset for your Localix account.</p>"
            f"<p><a href=\"{reset_url}\">Click here to reset your password</a></p>"
            "<p>If you did not request this, you can ignore this email.</p>"
        )

        try:
            email_message = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            email_message.attach_alternative(html_body, "text/html")
            sent_count = email_message.send(fail_silently=False)
            if sent_count != 1:
                return Response(
                    {"detail": "Could not send reset email right now. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except (BadHeaderError, Exception):
            return Response(
                {"detail": "Could not send reset email right now. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        logger.info("Password reset link sent to registered email %s", user.email)
        return Response({"detail": f"Reset link sent to {user.email}."})


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

    def perform_update(self, serializer):
        post = self.get_object()
        actor = self.request.user
        owner = getattr(post, "owner", None)
        if not actor or not owner or int(actor.id) != int(owner.id):
            raise PermissionDenied("Only the post owner can edit this post.")
        serializer.save()

    def perform_destroy(self, instance):
        actor = self.request.user
        owner = getattr(instance, "owner", None)
        if not actor or not owner or int(actor.id) != int(owner.id):
            raise PermissionDenied("Only the post owner can delete this post.")
        instance.delete()


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

    def _as_dict(self, value):
        return value if isinstance(value, dict) else {}

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

    def _to_int(self, value, default=0):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return int(default)

    def _normalize_expertise_source(self, value):
        source = str(value or "").strip().lower()
        if source == "skill":
            return "skill"
        return "expertise"

    def _collect_snapshot_usage(self, snapshot):
        data = self._as_dict(snapshot)
        usage = {
            "products": {},
            "services": {},
            "expertise_people": {},
            "expertise_duration": {},
        }

        for row in data.get("products") or []:
            if not isinstance(row, dict) or row.get("included") is False:
                continue
            row_id = self._to_int(row.get("id"))
            qty = self._to_int(row.get("offered_quantity", row.get("quantity", 0)))
            if row_id > 0 and qty > 0:
                usage["products"][row_id] = usage["products"].get(row_id, 0) + qty

        for row in data.get("services") or []:
            if not isinstance(row, dict) or row.get("included") is False:
                continue
            row_id = self._to_int(row.get("id"))
            count = self._to_int(row.get("quantity", 1), default=1)
            if row_id > 0 and count > 0:
                usage["services"][row_id] = usage["services"].get(row_id, 0) + count

        for row in data.get("expertise") or []:
            if not isinstance(row, dict) or row.get("included") is False:
                continue
            row_id = self._to_int(row.get("id"))
            if row_id <= 0:
                continue
            source = self._normalize_expertise_source(row.get("source"))
            key = (source, row_id)

            people = self._to_int(row.get("offered_people", row.get("quantity", 0)))
            duration = self._to_int(row.get("offered_hours", row.get("duration", 0)))

            if people > 0:
                usage["expertise_people"][key] = usage["expertise_people"].get(key, 0) + people
            if duration > 0:
                usage["expertise_duration"][key] = usage["expertise_duration"].get(key, 0) + duration

        return usage

    def _merge_usage(self, target, source):
        for section in ("products", "services", "expertise_people", "expertise_duration"):
            for key, value in (source.get(section) or {}).items():
                target[section][key] = target[section].get(key, 0) + self._to_int(value)

    def _validate_capacity_for_snapshot(self, post, snapshot, exclude_erp_id=None):
        if not post:
            return

        requested_usage = self._collect_snapshot_usage(snapshot)
        if not any(requested_usage[section] for section in requested_usage):
            return

        consumed_usage = {
            "products": {},
            "services": {},
            "expertise_people": {},
            "expertise_duration": {},
        }

        configured_qs = ERP.objects.filter(post=post, is_configured=True)
        if exclude_erp_id:
            configured_qs = configured_qs.exclude(id=exclude_erp_id)

        for existing in configured_qs.only("configuration_snapshot"):
            self._merge_usage(consumed_usage, self._collect_snapshot_usage(existing.configuration_snapshot))

        product_map = {p.id: p for p in Product.objects.filter(post=post)}
        expertise_map = {e.id: e for e in Expertise.objects.filter(post=post)}
        skill_map = {s.id: s for s in Skill.objects.filter(post=post)}

        errors = []

        for product_id, requested_qty in requested_usage["products"].items():
            product = product_map.get(product_id)
            if not product:
                continue
            total_capacity = max(self._to_int(getattr(product, "available_units", 0)), 0)
            consumed = max(self._to_int(consumed_usage["products"].get(product_id, 0)), 0)
            remaining = max(total_capacity - consumed, 0)
            if requested_qty > remaining:
                errors.append(
                    f'Product "{product.product_name}": requested {requested_qty}, only {remaining} remaining.'
                )

        for service_id, requested_count in requested_usage["services"].items():
            skill = skill_map.get(service_id)
            if not skill:
                continue
            consumed = max(self._to_int(consumed_usage["services"].get(service_id, 0)), 0)
            remaining = max(1 - consumed, 0)
            if requested_count > remaining:
                errors.append(
                    f'Service "{skill.skill_name}": already booked/given for this post.'
                )

        for key, requested_people in requested_usage["expertise_people"].items():
            source, row_id = key
            consumed_people = max(self._to_int(consumed_usage["expertise_people"].get(key, 0)), 0)

            if source == "expertise":
                row = expertise_map.get(row_id)
                if not row:
                    continue
                total_people = max(self._to_int(getattr(row, "available_person", 0)), 0)
                remaining_people = max(total_people - consumed_people, 0)
                if requested_people > remaining_people:
                    errors.append(
                        f'Expertise "{row.name}": requested {requested_people} people, only {remaining_people} remaining.'
                    )
            else:
                row = skill_map.get(row_id)
                if not row:
                    continue
                total_people = self._to_int(getattr(row, "available_workers", 0), default=-1)
                if total_people < 0:
                    continue
                remaining_people = max(total_people - consumed_people, 0)
                if requested_people > remaining_people:
                    errors.append(
                        f'Expertise "{row.skill_name}": requested {requested_people} people, only {remaining_people} remaining.'
                    )

        for key, requested_duration in requested_usage["expertise_duration"].items():
            source, row_id = key
            if source != "expertise":
                continue
            row = expertise_map.get(row_id)
            if not row:
                continue
            total_duration = max(self._to_int(getattr(row, "needed_budget_unit", 0)), 0)
            consumed_duration = max(self._to_int(consumed_usage["expertise_duration"].get(key, 0)), 0)
            remaining_duration = max(total_duration - consumed_duration, 0)
            if requested_duration > remaining_duration:
                errors.append(
                    f'Expertise "{row.name}": requested duration {requested_duration}, only {remaining_duration} remaining.'
                )

        if errors:
            raise ValidationError(
                {
                    "detail": "Cannot accept/configure this offer. Some items are already given/booked.",
                    "items": errors,
                }
            )

    def _application_status(self, erp):
        snapshot = self._as_dict(erp.configuration_snapshot)
        submission = self._as_dict(snapshot.get("application_submission"))
        return str(submission.get("status") or "").strip().lower()

    def _is_demand_submission_approved(self, erp):
        post_type = str(getattr(erp.post, "post_type", "") or "").strip().lower()
        if post_type != "demand":
            return True
        return self._application_status(erp) in {"approved", "accepted", "confirmed"}

    def _notify_booking_confirmation(self, erp, actor):
        if not erp:
            return

        snapshot = self._as_dict(getattr(erp, "configuration_snapshot", None))
        post_snapshot = self._as_dict(snapshot.get("post"))
        post_title = (
            post_snapshot.get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or "a post"
        )
        provider_user = getattr(erp, "provider", None) or actor
        provider_name = (
            getattr(provider_user, "name", "")
            or getattr(provider_user, "username", "")
            or "Provider"
        )

        receiver = getattr(erp, "receiver", None) or getattr(erp.post, "owner", None)
        recipients = []
        if receiver:
            recipients.append(receiver)
        if provider_user and all(int(provider_user.id) != int(user.id) for user in recipients):
            recipients.append(provider_user)

        if not recipients:
            return

        try:
            notifications = []
            for target_user in recipients:
                target_is_provider = int(target_user.id) == int(provider_user.id)
                if target_is_provider:
                    message = (
                        f'Booking confirmation received for "{post_title}". '
                        "Head to your Booking Tracker to manage the workflow and track progress. "
                        f"Post link: /erp?erp_id={erp.id}"
                    )
                else:
                    message = (
                        f'Your booking for "{post_title}" has been confirmed by {provider_name}. '
                        "Head to your Booking Tracker to follow the progress from start to finish. "
                        f"Post link: /erp?erp_id={erp.id}"
                    )

                notifications.append(
                    Notification(
                        user=target_user,
                        title="Booking Confirmed",
                        message=message,
                    )
                )

            if notifications:
                Notification.objects.bulk_create(notifications)
        except Exception:
            logger.exception("Failed to create booking notification for ERP %s", getattr(erp, "id", None))

    @action(detail=True, methods=["post"], url_path="submit_application", url_name="submit_application")
    def submit_application(self, request, pk=None):
        erp = ERP.objects.select_related("post", "provider", "receiver").filter(pk=pk).first()
        if not erp:
            return Response({"detail": "ERP task not found."}, status=status.HTTP_404_NOT_FOUND)
        actor = request.user

        post = getattr(erp, "post", None)
        post_owner = getattr(post, "owner", None)
        is_participant = actor in [getattr(erp, "provider", None), getattr(erp, "receiver", None), post_owner]
        if not is_participant:
            raise PermissionDenied("You are not allowed to submit this application.")

        snapshot = self._as_dict(erp.configuration_snapshot)
        submission = self._as_dict(snapshot.get("application_submission"))
        submission["submitted_by"] = int(actor.id)
        submission["submitted_at"] = timezone.now().isoformat()
        submission["status"] = "submitted"
        snapshot["application_submission"] = submission

        note = str(request.data.get("note") or "").strip()
        notes = self._as_dict(snapshot.get("notes"))
        if note:
            notes["requester_note"] = note
        snapshot["notes"] = notes

        erp.configuration_snapshot = snapshot
        erp.save(update_fields=["configuration_snapshot", "updated_at"])

        post_title = (
            snapshot.get("post", {}).get("title")
            or getattr(post, "post_title", "")
            or getattr(post, "post_name", "")
            or "this post"
        )
        is_demand_post = str(getattr(post, "post_type", "") or "").strip().lower() == "demand"
        actor_name = getattr(actor, "name", "") or getattr(actor, "username", "") or "A user"

        notifications = [
            Notification(
                user=actor,
                title="Application Submitted",
                message=(
                    f'Your application for "{post_title}" has been sent to the post owner for review. '
                    "You'll be notified once a decision has been made."
                ) if is_demand_post else f"Your application was submitted successfully. Please wait for acceptance. (Post: '{post_title}')",
            )
        ]

        if post_owner and int(post_owner.id) != int(actor.id):
            notifications.append(
                Notification(
                    user=post_owner,
                    title="New Application Received" if is_demand_post else "Someone applied to your post - review now",
                    message=(
                        f'{actor_name} has applied to your post "{post_title}". '
                        "Review their application from your Dashboard and approve or reject to proceed. "
                        "Post link: /dashboard"
                    ) if is_demand_post else f"{actor_name} submitted an application for '{post_title}'. Open your dashboard to review and accept/reject. Post link: /dashboard",
                )
            )

        try:
            Notification.objects.bulk_create(notifications)
        except Exception:
            logger.exception("Failed to create submit_application notifications for ERP %s", getattr(erp, "id", None))
        return Response(self.get_serializer(erp).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="pending_applications", url_name="pending_applications")
    def pending_applications(self, request):
        actor = request.user
        post_id = request.query_params.get("post")

        queryset = ERP.objects.filter(post__post_type="Demand", post__owner=actor).select_related("post", "provider")

        if post_id:
            try:
                queryset = queryset.filter(post_id=int(post_id))
            except (TypeError, ValueError):
                raise ValidationError({"post": "Invalid post id."})

        pending = []
        for item in queryset.order_by("-updated_at", "-id"):
            snapshot = self._as_dict(item.configuration_snapshot)
            submission = self._as_dict(snapshot.get("application_submission"))
            if str(submission.get("status") or "").strip().lower() != "submitted":
                continue

            provider = getattr(item, "provider", None)
            post = getattr(item, "post", None)
            totals = self._as_dict(snapshot.get("totals"))

            def _to_number(value):
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return 0.0

            pending.append(
                {
                    "erp_id": item.id,
                    "post": {
                        "id": getattr(post, "id", None),
                        "title": getattr(post, "post_title", "") or getattr(post, "post_name", "") or "",
                        "type": getattr(post, "post_type", "") or "",
                    },
                    "applicant": {
                        "id": getattr(provider, "id", None),
                        "name": getattr(provider, "name", "") or getattr(provider, "username", "") or "",
                        "profile_photo": getattr(getattr(provider, "profile_photo", None), "url", "") if provider else "",
                    },
                    "totals": {
                        "expertise": _to_number(totals.get("expertise", 0)) if isinstance(totals, dict) else 0.0,
                        "services": _to_number(totals.get("services", 0)) if isinstance(totals, dict) else 0.0,
                        "products": _to_number(totals.get("products", 0)) if isinstance(totals, dict) else 0.0,
                        "grand": _to_number(totals.get("grand", 0)) if isinstance(totals, dict) else 0.0,
                    },
                    "submitted_at": submission.get("submitted_at"),
                    "submitted_by": submission.get("submitted_by"),
                    "configuration_snapshot": snapshot,
                }
            )

        return Response(pending, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="approve_application", url_name="approve_application")
    def approve_application(self, request, pk=None):
        erp = self.get_object()
        actor = request.user
        post = getattr(erp, "post", None)

        if not post or str(getattr(post, "post_type", "")).strip().lower() != "demand":
            raise ValidationError({"detail": "Application approval is only available for demand posts."})

        post_owner = getattr(post, "owner", None)
        if not post_owner or int(post_owner.id) != int(actor.id):
            raise PermissionDenied("Only the demand post owner can approve this application.")

        snapshot = self._as_dict(erp.configuration_snapshot)
        submission = self._as_dict(snapshot.get("application_submission"))
        current_status = str(submission.get("status") or "").strip().lower()
        if current_status != "submitted":
            raise ValidationError({"detail": "Only submitted applications can be approved."})

        submission["status"] = "approved"
        submission["approved_by"] = int(actor.id)
        submission["approved_at"] = timezone.now().isoformat()
        snapshot["application_submission"] = submission

        self._validate_capacity_for_snapshot(
            post=post,
            snapshot=snapshot,
            exclude_erp_id=erp.id,
        )

        erp.configuration_snapshot = snapshot
        erp.is_configured = True
        erp.save(update_fields=["configuration_snapshot", "is_configured", "updated_at"])

        post_title = (
            snapshot.get("post", {}).get("title")
            or getattr(post, "post_title", "")
            or getattr(post, "post_name", "")
            or "this post"
        )
        owner_name = getattr(actor, "name", "") or getattr(actor, "username", "") or "Post owner"

        provider = getattr(erp, "provider", None)
        applicant_name = (
            getattr(provider, "name", "")
            or getattr(provider, "username", "")
            or "Applicant"
        )
        notifications = [
            Notification(
                user=actor,
                title="Application Approved",
                message=(
                    f"You've approved {applicant_name}'s application for \"{post_title}\". "
                    "The Tracker is now active - complete your setup to get started. "
                    f"Post link: /erp?erp_id={erp.id}"
                ),
            )
        ]

        if provider and int(provider.id) != int(actor.id):
            notifications.append(
                Notification(
                    user=provider,
                    title="Your Application Was Approved",
                    message=(
                        f'Great news! Your application for "{post_title}" has been approved by {owner_name}. '
                        "Your Tracker is now active and ready for setup. "
                        f"Post link: /erp?erp_id={erp.id}"
                    ),
                )
            )

        try:
            Notification.objects.bulk_create(notifications)
        except Exception:
            logger.exception("Failed to create approve_application notifications for ERP %s", getattr(erp, "id", None))
        return Response(self.get_serializer(erp).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject_application", url_name="reject_application")
    def reject_application(self, request, pk=None):
        erp = self.get_object()
        actor = request.user
        post = getattr(erp, "post", None)

        if not post or str(getattr(post, "post_type", "")).strip().lower() != "demand":
            raise ValidationError({"detail": "Application rejection is only available for demand posts."})

        post_owner = getattr(post, "owner", None)
        if not post_owner or int(post_owner.id) != int(actor.id):
            raise PermissionDenied("Only the demand post owner can reject this application.")

        snapshot = self._as_dict(erp.configuration_snapshot)
        submission = self._as_dict(snapshot.get("application_submission"))
        current_status = str(submission.get("status") or "").strip().lower()
        if current_status != "submitted":
            raise ValidationError({"detail": "Only submitted applications can be rejected."})

        submission["status"] = "rejected"
        submission["rejected_by"] = int(actor.id)
        submission["rejected_at"] = timezone.now().isoformat()
        snapshot["application_submission"] = submission

        erp.configuration_snapshot = snapshot
        erp.is_configured = False
        erp.save(update_fields=["configuration_snapshot", "is_configured", "updated_at"])

        post_title = (
            snapshot.get("post", {}).get("title")
            or getattr(post, "post_title", "")
            or getattr(post, "post_name", "")
            or "this post"
        )
        provider = getattr(erp, "provider", None)

        if provider and int(provider.id) != int(actor.id):
            try:
                Notification.objects.create(
                    user=provider,
                    title="Application Not Accepted",
                    message=(
                        f'Unfortunately, your application for "{post_title}" was not accepted by the post owner at this time. '
                        "You're welcome to explore other available posts."
                    ),
                )
            except Exception:
                logger.exception("Failed to create reject_application notification for ERP %s", getattr(erp, "id", None))

        return Response(self.get_serializer(erp).data, status=status.HTTP_200_OK)

    def _notify_provider_member_activity(self, erp, actor, title, message):
        provider = getattr(erp, "provider", None)
        actor_id = getattr(actor, "id", None)
        provider_id = getattr(provider, "id", None)

        # Notify only for actions done by non-provider members.
        if not provider or not actor_id or provider_id == actor_id:
            return

        try:
            Notification.objects.create(
                user=provider,
                title=title,
                message=message,
            )
        except Exception:
            logger.exception("Failed provider-member activity notification for ERP %s", getattr(erp, "id", None))

    def _notify_manual_member_additions(self, erp, role, added_ids):
        provider = getattr(erp, "provider", None)
        if not provider or not added_ids:
            return

        role_label = role.replace("_", " ").title()
        post_title = (
            self._as_dict(getattr(erp, "configuration_snapshot", None)).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"Booking #{erp.id}"
        )

        members = User.objects.filter(id__in=list(added_ids))
        is_demand_post = str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand"
        notifications = []
        for member in members:
            member_name = member.name or member.username or member.email or f"User #{member.id}"
            notifications.append(
                Notification(
                    user=provider,
                    title="Team Member Added",
                    message=(
                        f'{member_name} has been assigned to your booking "{post_title}" as {role_label}. '
                        f"Post link: /erp?erp_id={erp.id}"
                    ),
                )
            )

        if notifications:
            Notification.objects.bulk_create(notifications)

    def get_queryset(self):
        user = self.request.user
        base_queryset = ERP.objects.filter(
            Q(provider=user) | Q(receiver=user) | Q(post__owner=user) | Q(assigned_workers=user)
        ).distinct()

        base_ids = set(base_queryset.values_list("id", flat=True))
        additional_ids = set()
        candidates = ERP.objects.exclude(id__in=base_ids).select_related("provider", "receiver", "post")

        for item in candidates:
            snapshot = self._as_dict(item.configuration_snapshot)
            members = self._as_dict(snapshot.get("members"))

            for role in self._allowed_member_roles():
                for role_bucket in self._iter_role_buckets(members, role):
                    # Always include ERP for explicitly assigned members.
                    raw_assignees = role_bucket.get("assignee_ids") or []
                    assignee_ids = set()
                    for raw_id in raw_assignees:
                        try:
                            assignee_ids.add(int(raw_id))
                        except (TypeError, ValueError):
                            continue

                    if int(user.id) in assignee_ids:
                        additional_ids.add(int(item.id))
                        break

                    if not bool(role_bucket.get("self_assign_enabled", False)):
                        continue

                    raw_targets = role_bucket.get("self_assign_target_ids", None)
                    target_ids = set()
                    for raw_id in (raw_targets or []):
                        try:
                            target_ids.add(int(raw_id))
                        except (TypeError, ValueError):
                            continue

                    # Backward compatibility only when key is missing, not when explicitly empty.
                    if raw_targets is None and not target_ids and item.provider:
                        # Backward compatibility for snapshots created before target IDs were stored.
                        target_ids = self._get_accepted_connection_member_ids(item.provider, role=role)

                    if int(user.id) in target_ids:
                        additional_ids.add(int(item.id))
                        break

                if int(item.id) in additional_ids:
                    break

        if not additional_ids:
            merged_queryset = base_queryset
        else:
            merged_queryset = ERP.objects.filter(Q(id__in=base_ids) | Q(id__in=additional_ids)).distinct()

        visible_ids = []
        for item in merged_queryset.select_related("post"):
            # Demand applications stay visible to the demand post owner for review,
            # but remain hidden from task views until approved for others.
            post_owner_id = getattr(item.post, "owner_id", None)
            if post_owner_id and int(post_owner_id) == int(user.id):
                visible_ids.append(int(item.id))
                continue

            if self._is_demand_submission_approved(item):
                visible_ids.append(int(item.id))

        if not visible_ids:
            return ERP.objects.none()

        return ERP.objects.filter(id__in=visible_ids).distinct()

    def create(self, request, *args, **kwargs):
        try:
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

            if self._to_bool(serializer.validated_data.get("is_configured", False)):
                self._validate_capacity_for_snapshot(
                    post=post,
                    snapshot=serializer.validated_data.get("configuration_snapshot") or {},
                )

            instance = serializer.save(provider=provider, receiver=receiver, category=category)
            if self._to_bool(serializer.validated_data.get("is_configured", False)):
                self._notify_booking_confirmation(instance, actor)
            data = self.get_serializer(instance).data
            headers = self.get_success_headers(data)
            return Response(data, status=status.HTTP_201_CREATED, headers=headers)
        except (ValidationError, PermissionDenied):
            raise
        except Exception as exc:
            logger.exception("Unhandled ERP create error for user %s", getattr(request.user, "id", None))
            raise ValidationError({"detail": f"ERP create failed: {exc}"})

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            next_is_configured = self._to_bool(request.data.get("is_configured", instance.is_configured))
            if next_is_configured:
                self._validate_capacity_for_snapshot(
                    post=instance.post,
                    snapshot=request.data.get("configuration_snapshot", instance.configuration_snapshot) or {},
                    exclude_erp_id=instance.id,
                )
            response = super().partial_update(request, *args, **kwargs)
            if self._to_bool(request.data.get("is_configured", False)):
                self._notify_booking_confirmation(self.get_object(), request.user)
            return response
        except (ValidationError, PermissionDenied):
            raise
        except Exception as exc:
            logger.exception("Unhandled ERP partial_update error for user %s", getattr(request.user, "id", None))
            raise ValidationError({"detail": f"ERP update failed: {exc}"})

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            next_is_configured = self._to_bool(request.data.get("is_configured", instance.is_configured))
            if next_is_configured:
                self._validate_capacity_for_snapshot(
                    post=instance.post,
                    snapshot=request.data.get("configuration_snapshot", instance.configuration_snapshot) or {},
                    exclude_erp_id=instance.id,
                )
            response = super().update(request, *args, **kwargs)
            if self._to_bool(request.data.get("is_configured", False)):
                self._notify_booking_confirmation(self.get_object(), request.user)
            return response
        except (ValidationError, PermissionDenied):
            raise
        except Exception as exc:
            logger.exception("Unhandled ERP update error for user %s", getattr(request.user, "id", None))
            raise ValidationError({"detail": f"ERP update failed: {exc}"})

    def perform_create(self, serializer):
        actor = self.request.user
        post = serializer.validated_data.get("post")

        if not post:
            raise ValidationError({"post": "Post is required."})

        provider, receiver, category = self._resolve_roles(actor, post)

        serializer.save(provider=provider, receiver=receiver, category=category)

    def _allowed_member_roles(self):
        return {"expertise", "skill_provider", "supplier"}

    def _member_role_aliases(self):
        return {
            "expertise": {"expertise"},
            "skill_provider": {"skill_provider", "service_provider"},
            "supplier": {"supplier", "delivery_man", "delivary_man", "delivery"},
        }

    def _iter_role_buckets(self, members, role):
        aliases = self._member_role_aliases().get(role, {role})
        for key in aliases:
            bucket = members.get(key) or {}
            if isinstance(bucket, dict):
                yield bucket

    def _get_member_bucket(self, erp, role):
        snapshot = self._as_dict(erp.configuration_snapshot)
        members = self._as_dict(snapshot.get("members"))

        merged_role_bucket = {}
        for bucket in self._iter_role_buckets(members, role):
            merged_role_bucket.update(bucket)

        role_bucket = merged_role_bucket
        existing_ids = role_bucket.get("assignee_ids") or []
        assignee_ids = []
        for raw_id in existing_ids:
            try:
                assignee_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        existing_target_ids = role_bucket.get("self_assign_target_ids") or []
        target_ids = []
        for raw_id in existing_target_ids:
            try:
                target_ids.append(int(raw_id))
            except (TypeError, ValueError):
                continue

        post_id_value = role_bucket.get("self_assign_post_id")
        try:
            post_id_value = int(post_id_value) if post_id_value is not None else None
        except (TypeError, ValueError):
            post_id_value = None

        role_bucket = {
            "assignee_ids": sorted(list(set(assignee_ids))),
            "self_assign_enabled": bool(role_bucket.get("self_assign_enabled", False)),
            "self_assign_message": str(role_bucket.get("self_assign_message", "") or "").strip(),
            "self_assign_post_link": str(role_bucket.get("self_assign_post_link", "") or "").strip(),
            "self_assign_post_title": str(role_bucket.get("self_assign_post_title", "") or "").strip(),
            "self_assign_post_id": post_id_value,
            "self_assign_target_ids": sorted(list(set(target_ids))),
            "self_assign_published_at": role_bucket.get("self_assign_published_at"),
        }
        members[role] = role_bucket
        snapshot["members"] = members
        return snapshot, members, role_bucket

    def _save_snapshot(self, erp, snapshot):
        erp.configuration_snapshot = snapshot
        erp.save(update_fields=["configuration_snapshot", "updated_at"])

    def _get_provider_rated_user_ids(self, erp):
        snapshot = self._as_dict(erp.configuration_snapshot)
        feedback = self._as_dict(snapshot.get("feedback"))
        rated_ids = set()
        for raw_id in feedback.get("provider_rating_user_ids") or []:
            try:
                parsed = int(raw_id)
            except (TypeError, ValueError):
                continue
            if parsed > 0:
                rated_ids.add(parsed)
        return rated_ids

    def _mark_provider_rated(self, erp, user_id):
        snapshot = self._as_dict(erp.configuration_snapshot)
        feedback = self._as_dict(snapshot.get("feedback"))
        rated_ids = self._get_provider_rated_user_ids(erp)
        rated_ids.add(int(user_id))
        feedback["provider_rating_user_ids"] = sorted(list(rated_ids))
        snapshot["feedback"] = feedback
        self._save_snapshot(erp, snapshot)

    def _get_accepted_connection_member_ids(self, user, role=None):
        if not user:
            return set()

        role_filter = str(role or "").strip().lower()
        if role_filter and role_filter not in self._allowed_member_roles():
            role_filter = ""

        accepted = Connection.objects.filter(status=ConnectionStatus.ACCEPTED).filter(
            Q(requester=user) | Q(addressee=user)
        )

        accepted_ids = set()
        for conn in accepted:
            requested_role = str(conn.requested_role or "").strip().lower()
            if role_filter and requested_role != role_filter:
                continue

            other_id = conn.addressee_id if conn.requester_id == user.id else conn.requester_id
            if other_id and int(other_id) != int(user.id):
                accepted_ids.add(int(other_id))

        return accepted_ids

    def _get_connection_member_ids(self, user):
        accepted_ids = self._get_accepted_connection_member_ids(user)

        erp_items = ERP.objects.filter(Q(provider=user) | Q(receiver=user)).select_related(
            "post"
        )
        erp_history_ids = set()
        for item in erp_items:
            participants = {
                item.provider_id,
                item.receiver_id,
                getattr(item.post, "owner_id", None),
            }
            for participant_id in participants:
                if participant_id and int(participant_id) != int(user.id):
                    erp_history_ids.add(int(participant_id))

        # Connection members can belong to live/new/recent categories.
        return accepted_ids.union(erp_history_ids)

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

        added_ids = updated.difference(existing)
        if added_ids:
            self._notify_manual_member_additions(erp, role, added_ids)

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def publish_member_post(self, request, pk=None):
        erp = self.get_object()

        if not erp.provider or erp.provider.id != request.user.id:
            raise PermissionDenied("Only provider can publish member assignment posts.")

        role = str(request.data.get("role", "")).strip().lower()
        if role not in self._allowed_member_roles():
            return Response({"detail": "Invalid member role."}, status=status.HTTP_400_BAD_REQUEST)

        custom_message = str(request.data.get("message", "") or "").strip()
        role_title = role.replace("_", " ").title()
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"Post #{erp.post_id}"
        )
        post_link = (
            f"/dashboard/{erp.post.owner_id}?post={erp.post_id}"
            if erp.post and erp.post.owner_id
            else f"/erp?erp_id={erp.id}&role={role}"
        )
        target_ids = sorted(list(self._get_accepted_connection_member_ids(request.user, role=role)))

        snapshot, members, role_bucket = self._get_member_bucket(erp, role)
        role_bucket["self_assign_enabled"] = True
        role_bucket["self_assign_message"] = custom_message
        role_bucket["self_assign_post_link"] = post_link
        role_bucket["self_assign_post_title"] = str(post_title)
        role_bucket["self_assign_post_id"] = int(erp.post_id) if erp.post_id else None
        role_bucket["self_assign_target_ids"] = target_ids
        role_bucket["self_assign_published_at"] = timezone.now().isoformat()
        members[role] = role_bucket
        snapshot["members"] = members
        self._save_snapshot(erp, snapshot)

        receivers = User.objects.filter(id__in=list(target_ids)).exclude(id=request.user.id)
        provider_name = request.user.name or request.user.username or request.user.email or "Provider"
        is_demand_post = str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand"
        if is_demand_post:
            body = (
                f'{provider_name} is looking for someone to fill the {role_title} role on "{post_title}". '
                "Visit your Connections to apply. "
                "Post link: /connections"
            )
        else:
            body = f"ERP #{erp.id} is open for self-assignment as {role_title} for post '{post_title}'."
            if custom_message:
                body = f"{body} Message: {custom_message}"
            body = f"{body} Post link: {post_link}"

        notifications = [
            Notification(
                user=target,
                title=f"Open Role Available: {role_title}" if is_demand_post else f"ERP Self-Assign Open: {role_title}",
                message=body,
            )
            for target in receivers
        ]
        if notifications:
            Notification.objects.bulk_create(notifications)

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def close_member_post(self, request, pk=None):
        erp = self.get_object()

        if not erp.provider or erp.provider.id != request.user.id:
            raise PermissionDenied("Only provider can close member assignment posts.")

        role = str(request.data.get("role", "")).strip().lower()
        if role not in self._allowed_member_roles():
            return Response({"detail": "Invalid member role."}, status=status.HTTP_400_BAD_REQUEST)

        snapshot, members, role_bucket = self._get_member_bucket(erp, role)
        role_bucket["self_assign_enabled"] = False
        role_bucket["self_assign_message"] = ""
        role_bucket["self_assign_post_link"] = ""
        role_bucket["self_assign_post_title"] = ""
        role_bucket["self_assign_post_id"] = None
        role_bucket["self_assign_target_ids"] = []
        role_bucket["self_assign_published_at"] = None
        members[role] = role_bucket
        snapshot["members"] = members
        self._save_snapshot(erp, snapshot)

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

        raw_targets = role_bucket.get("self_assign_target_ids", None)
        allowed_member_ids = set(raw_targets or [])
        if raw_targets is None and not allowed_member_ids and erp.provider:
            # Backward compatibility for old records published before role target IDs were saved.
            allowed_member_ids = self._get_accepted_connection_member_ids(erp.provider, role=role)

        if request.user.id not in allowed_member_ids:
            raise PermissionDenied("Only connection members can self-assign to this ERP role.")

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

        actor_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        role_label = role.replace("_", " ").title()
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"ERP #{erp.id}"
        )
        action_text = "assigned themselves" if should_assign else "removed themselves"
        if should_assign:
            self._notify_provider_member_activity(
                erp,
                request.user,
                "New Team Member Joined",
                (
                    f'{actor_name} joined your booking "{post_title}" via the open assignment. '
                    f"Post link: /erp?erp_id={erp.id}"
                ),
            )
        else:
            self._notify_provider_member_activity(
                erp,
                request.user,
                "Team Member Left",
                (
                    f'{actor_name} has left the booking "{post_title}". '
                    "You may want to assign a replacement. "
                    f"Post link: /erp?erp_id={erp.id}"
                ),
            )

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def leave_assignment(self, request, pk=None):
        erp = self.get_object()
        user_id = int(request.user.id)

        snapshot = erp.configuration_snapshot or {}
        members = snapshot.get("members") or {}
        changed = False
        left_roles = []

        # Remove user from all member role buckets (including legacy/custom keys).
        for role_key, role_bucket in list(members.items()):
            if not isinstance(role_bucket, dict):
                continue

            existing_ids = role_bucket.get("assignee_ids") or []
            clean_ids = []
            for raw_id in existing_ids:
                try:
                    parsed = int(raw_id)
                except (TypeError, ValueError):
                    continue
                if parsed > 0:
                    clean_ids.append(parsed)

            unique_ids = set(clean_ids)
            if user_id in unique_ids:
                unique_ids.discard(user_id)
                changed = True
                left_roles.append(str(role_key))

            role_bucket["assignee_ids"] = sorted(list(unique_ids))

            # Also remove from self-assign target visibility so ERP card disappears after leave.
            existing_targets = role_bucket.get("self_assign_target_ids", None)
            if existing_targets is not None:
                clean_targets = []
                for raw_id in existing_targets:
                    try:
                        parsed_target = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    if parsed_target > 0 and parsed_target != user_id:
                        clean_targets.append(parsed_target)

                if len(clean_targets) != len(list(existing_targets)):
                    changed = True
                role_bucket["self_assign_target_ids"] = sorted(list(set(clean_targets)))

            members[role_key] = role_bucket

        # Backward compatibility: some records may still track member assignment here.
        if erp.assigned_workers.filter(id=user_id).exists():
            erp.assigned_workers.remove(request.user)
            changed = True

        if not changed:
            return Response(
                {"detail": "You are not assigned to this ERP task."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshot["members"] = members
        erp.configuration_snapshot = snapshot
        erp.save(update_fields=["configuration_snapshot", "updated_at"])

        actor_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"ERP #{erp.id}"
        )
        left_roles_text = ", ".join(sorted(set(left_roles))) if left_roles else "assigned roles"
        self._notify_provider_member_activity(
            erp,
            request.user,
            "Team Member Left",
            (
                f'{actor_name} has left the booking "{post_title}". '
                "You may want to assign a replacement. "
                f"Post link: /erp?erp_id={erp.id}"
            ),
        )

        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["patch"])
    def update_stage(self, request, pk=None):
        erp = self.get_object()
        stage = request.data.get("stage")
        if not stage:
            return Response({"detail": "Stage is required."}, status=400)

        if stage == "Completed":
            return Response(
                {"detail": "Use complete_by_receiver with rating and comment to finish this ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if stage == "Pending" and (not erp.provider or erp.provider.id != request.user.id):
            raise PermissionDenied("Only provider can move task back to Pending.")

        if stage == "On Process" and (not erp.provider or erp.provider.id != request.user.id):
            raise PermissionDenied("Only provider can move task to On Process.")

        erp.stage = stage
        erp.save(update_fields=["stage", "updated_at"])
        return Response(self.get_serializer(erp).data)

    @action(detail=True, methods=["post"])
    def complete_by_receiver(self, request, pk=None):
        erp = self.get_object()

        if erp.stage != "On Process":
            return Response(
                {"detail": "ERP can be completed only from On Process state."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not erp.receiver or erp.receiver.id != request.user.id:
            raise PermissionDenied("Only receiver can complete this ERP task.")

        comment = str(request.data.get("comment", "") or "").strip()
        rating_raw = request.data.get("rating")

        if not comment:
            return Response({"detail": "Completion comment is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating_value = int(rating_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Rating must be an integer from 1 to 5."}, status=status.HTTP_400_BAD_REQUEST)

        if rating_value < 1 or rating_value > 5:
            return Response({"detail": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

        if not erp.post_id or not erp.provider_id:
            return Response(
                {"detail": "ERP is missing post/provider links required for completion rating."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider_rating = Rating.objects.create(
            post=erp.post,
            provider=erp.provider,
            customer=request.user,
            rating_value=rating_value,
            review_text=comment,
        )
        self._mark_provider_rated(erp, request.user.id)

        erp.stage = "Completed"
        erp.completion_comment = comment
        erp.completion_rating = rating_value
        erp.completed_by = request.user
        erp.completed_at = timezone.now()
        erp.save(
            update_fields=[
                "stage",
                "completion_comment",
                "completion_rating",
                "completed_by",
                "completed_at",
                "updated_at",
            ]
        )

        receiver_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"ERP #{erp.id}"
        )

        Notification.objects.create(
            user=erp.provider,
            title="Task Completed by Receiver" if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else "Booking Completed by Receiver",
            message=(
                f'{receiver_name} has marked "{post_title}" as complete with a {rating_value}/5 rating. '
                f'Their comment: "{comment}". '
                "You can now rate the participating team members. "
                f"Post link: /erp?erp_id={erp.id}"
            ) if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else (
                f'{receiver_name} has marked booking "{post_title}" as complete. '
                f'They left a {rating_value}/5 rating with the comment: "{comment}". '
                "You may now rate the team members who participated. "
                f"Post link: /erp?erp_id={erp.id}"
            ),
        )

        snapshot_members = (erp.configuration_snapshot or {}).get("members") or {}
        participant_ids = set()
        for role_key in self._allowed_member_roles():
            for role_bucket in self._iter_role_buckets(snapshot_members, role_key):
                for raw_id in role_bucket.get("assignee_ids") or []:
                    try:
                        parsed = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    if parsed > 0 and parsed not in {request.user.id, erp.provider_id}:
                        participant_ids.add(parsed)

        participants = User.objects.filter(id__in=list(participant_ids))
        if participants:
            Notification.objects.bulk_create(
                [
                    Notification(
                        user=participant,
                        title="Task Successfully Completed" if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else "Booking Completed",
                        message=(
                            f'The task "{post_title}" has been marked as complete. '
                            "The provider may now submit individual ratings for all team members involved. "
                            f"Post link: /erp?erp_id={erp.id}"
                        ) if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else (
                            f'The booking for "{post_title}" has been successfully completed. '
                            "The provider can now submit individual ratings for all participating team members. "
                            f"Post link: /erp?erp_id={erp.id}"
                        ),
                    )
                    for participant in participants
                ]
            )

        Notification.objects.create(
            user=request.user,
            title="Completion Submitted Successfully",
            message=(
                f'Your completion and rating for "{post_title}" have been recorded. '
                "Thank you for using the Booking Tracker — your feedback helps the community! "
                f"Post link: /erp?erp_id={erp.id}"
            ),
        )

        return Response(
            {
                "detail": "ERP completed successfully.",
                "erp": self.get_serializer(erp).data,
                "rating": RatingSerializer(provider_rating).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def rate_participant(self, request, pk=None):
        erp = self.get_object()

        if not erp.provider or erp.provider.id != request.user.id:
            raise PermissionDenied("Only provider can rate participants for this ERP.")

        if erp.stage != "Completed":
            return Response(
                {"detail": "Participants can be rated only after ERP is completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant_id_raw = request.data.get("participant_id")
        rating_raw = request.data.get("rating")
        comment = str(request.data.get("comment", "") or "").strip()

        try:
            participant_id = int(participant_id_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Valid participant_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating_value = int(rating_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Rating must be an integer from 1 to 5."}, status=status.HTTP_400_BAD_REQUEST)

        if rating_value < 1 or rating_value > 5:
            return Response({"detail": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

        if not comment:
            return Response({"detail": "Rating comment is required."}, status=status.HTTP_400_BAD_REQUEST)

        candidate_ids = set()
        if erp.receiver_id:
            candidate_ids.add(int(erp.receiver_id))

        snapshot_members = (erp.configuration_snapshot or {}).get("members") or {}
        for role_key in self._allowed_member_roles():
            for role_bucket in self._iter_role_buckets(snapshot_members, role_key):
                for raw_id in role_bucket.get("assignee_ids") or []:
                    try:
                        parsed = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    if parsed > 0:
                        candidate_ids.add(parsed)

        candidate_ids.update(
            int(uid) for uid in erp.assigned_workers.values_list("id", flat=True)
        )

        candidate_ids.discard(int(request.user.id))

        if participant_id not in candidate_ids:
            return Response(
                {"detail": "Selected participant is not part of this ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant = User.objects.filter(id=participant_id).first()
        if not participant:
            return Response({"detail": "Participant not found."}, status=status.HTTP_404_NOT_FOUND)

        if not erp.post_id:
            return Response({"detail": "ERP post is required for participant rating."}, status=status.HTTP_400_BAD_REQUEST)

        rating_obj = Rating.objects.create(
            post=erp.post,
            provider=participant,
            customer=request.user,
            rating_value=rating_value,
            review_text=comment,
        )

        provider_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"Booking #{erp.id}"
        )
        Notification.objects.create(
            user=participant,
            title="You Received a New Rating",
            message=(
                f'{provider_name} has rated your contribution to "{post_title}" — {rating_value}/5. '
                f'Their feedback: "{comment}" '
                f"Post link: /erp?erp_id={erp.id}"
            ),
        )

        return Response(
            {
                "detail": "Participant rating submitted.",
                "rating": RatingSerializer(rating_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def rate_provider(self, request, pk=None):
        erp = self.get_object()

        if erp.stage != "Completed":
            return Response(
                {"detail": "Provider can be rated only after ERP is completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not erp.provider_id:
            return Response({"detail": "ERP provider is missing."}, status=status.HTTP_400_BAD_REQUEST)

        if int(request.user.id) == int(erp.provider_id):
            raise PermissionDenied("Provider cannot rate themselves.")

        allowed_ids = set()
        if erp.receiver_id:
            allowed_ids.add(int(erp.receiver_id))

        snapshot_members = (erp.configuration_snapshot or {}).get("members") or {}
        for role_key in self._allowed_member_roles():
            for role_bucket in self._iter_role_buckets(snapshot_members, role_key):
                for raw_id in role_bucket.get("assignee_ids") or []:
                    try:
                        parsed = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    if parsed > 0:
                        allowed_ids.add(parsed)

        allowed_ids.update(int(uid) for uid in erp.assigned_workers.values_list("id", flat=True))

        if int(request.user.id) not in allowed_ids:
            raise PermissionDenied("Only receiver or assigned members can rate provider for this ERP.")

        if int(request.user.id) in self._get_provider_rated_user_ids(erp):
            return Response(
                {"detail": "You already submitted your feedback for this provider in this ERP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rating_raw = request.data.get("rating")
        comment = str(request.data.get("comment", "") or "").strip()

        try:
            rating_value = int(rating_raw)
        except (TypeError, ValueError):
            return Response({"detail": "Rating must be an integer from 1 to 5."}, status=status.HTTP_400_BAD_REQUEST)

        if rating_value < 1 or rating_value > 5:
            return Response({"detail": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

        if not comment:
            return Response({"detail": "Comment is required."}, status=status.HTTP_400_BAD_REQUEST)

        rating_obj = Rating.objects.create(
            post=erp.post,
            provider=erp.provider,
            customer=request.user,
            rating_value=rating_value,
            review_text=comment,
        )

        self._mark_provider_rated(erp, request.user.id)
        erp.refresh_from_db()

        actor_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"Booking #{erp.id}"
        )
        Notification.objects.create(
            user=erp.provider,
            title="New Feedback on Your Service" if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else "New Feedback on Your Booking",
            message=(
                f'{actor_name} rated your service on "{post_title}" — {rating_value}/5 '
                f'with the comment: "{comment}". Your feedback history has been updated. '
                f"Post link: /erp?erp_id={erp.id}"
            ) if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else (
                f'{actor_name} has rated your service for "{post_title}" — {rating_value}/5 '
                f'with the comment: "{comment}". Keep up the great work! '
                f"Post link: /erp?erp_id={erp.id}"
            ),
        )

        return Response(
            {
                "detail": "Your feedback has been submitted.",
                "erp": self.get_serializer(erp).data,
                "rating": RatingSerializer(rating_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )

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
            return display

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

        assigned_workers = [user_label(worker) for worker in erp.assigned_workers.all()]
        member_roles = [
            ("expertise", "Expertise"),
            ("skill_provider", "Skill provider"),
            ("supplier", "Delivary Man"),
        ]
        snapshot_members = snapshot.get("members") or {}
        associated_member_ids = set()
        role_member_ids = {}

        for role_key, _ in member_roles:
            role_bucket = snapshot_members.get(role_key) or {}
            raw_ids = role_bucket.get("assignee_ids") or []
            clean_ids = []
            for raw_id in raw_ids:
                try:
                    parsed = int(raw_id)
                except (TypeError, ValueError):
                    continue
                if parsed > 0:
                    clean_ids.append(parsed)
            unique_ids = sorted(list(set(clean_ids)))
            role_member_ids[role_key] = unique_ids
            associated_member_ids.update(unique_ids)

        associated_users_by_id = {
            user.id: user for user in User.objects.filter(id__in=list(associated_member_ids))
        }

        def member_card_text(user):
            if not user:
                return "Unknown user"

            display_name = user.name or user.username or user.email or f"User #{user.id}"
            phone = user.phone or "-"
            email = user.email or "-"
            location = user.location or "-"
            return f"{display_name} | Phone: {phone} | Email: {email} | Location: {location}"

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setTitle("ERP Slip")

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
                headers = ["Name", "Packages", "Unit Cost", "Line Total"]
                values_builder = lambda row: [
                    as_text(row.get("name") or "-"),
                    as_text(row.get("quantity", 0)),
                    as_money(row.get("unit_cost", 0)),
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
            "Localix ERP Slip",
            f"Generated by: {user_label(actor)}   |   Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )

        draw_section("Card Information")
        draw_kv("Role", role_label)
        draw_kv("Current Stage", erp.stage)
        draw_kv("Location", post.location if post else "-")
        draw_kv("Provider", user_label(provider))
        draw_kv("Receiver", user_label(receiver))
        draw_kv("Rating", f"{float(post_rating):.2f}")
        draw_kv("Total Cost", as_money(erp.total_cost))

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

        draw_section("View Details - Associated Members")
        has_any_associated_members = False
        for role_key, role_label in member_roles:
            ids = role_member_ids.get(role_key) or []
            if not ids:
                draw_kv(f"{role_label}", "None")
                continue

            has_any_associated_members = True
            role_details = [member_card_text(associated_users_by_id.get(user_id)) for user_id in ids]
            draw_kv(f"{role_label}", " ; ".join(role_details), wrap=92)

        if not has_any_associated_members:
            draw_kv("Info", "No associated members assigned yet.")

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

        actor_name = request.user.name or request.user.username or request.user.email or f"User #{request.user.id}"
        post_title = (
            (erp.configuration_snapshot or {}).get("post", {}).get("title")
            or getattr(erp.post, "post_title", "")
            or getattr(erp.post, "post_name", "")
            or f"ERP #{erp.id}"
        )
        snippet = message_text[:80]
        self._notify_provider_member_activity(
            erp,
            request.user,
            "New Message on Your cart" if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else "New Message on Booking",
            (
                f'{actor_name} sent a message on "{post_title}". Tap to view and reply in the chat. '
                f"Post link: /erp?erp_id={erp.id}"
            ) if str(getattr(getattr(erp, "post", None), "post_type", "") or "").strip().lower() == "demand" else f'{actor_name} sent a message on "{post_title}". Tap to reply in the booking chat. Post link: /erp?erp_id={erp.id}',
        )

        serializer = ERPMessageSerializer(instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        """
        Only provider and receiver can delete an ERP card.
        When deleted:
        1. Removes the ERP for both parties
        2. Notifies provider, receiver, and all associated members
        """
        actor = self.request.user
        provider = getattr(instance, "provider", None)
        receiver = getattr(instance, "receiver", None)

        # Check if actor is provider or receiver
        if not (actor == provider or actor == receiver):
            raise PermissionDenied(
                "Only the provider and receiver can delete this ERP card. Associated members cannot delete."
            )

        # Collect all recipients for notification
        recipients = set()
        if provider:
            recipients.add(provider)
        if receiver:
            recipients.add(receiver)

        # Add all associated members from configuration_snapshot
        snapshot = self._as_dict(getattr(instance, "configuration_snapshot", None))
        members = self._as_dict(snapshot.get("members", {}))
        
        # Role keys that contain assignee IDs
        role_keys = ["expertise", "skill_provider", "supplier"]
        for role_key in role_keys:
            role_data = members.get(role_key)
            if isinstance(role_data, dict):
                assignee_ids = role_data.get("assignee_ids", [])
                if isinstance(assignee_ids, list):
                    for user_id in assignee_ids:
                        try:
                            user = User.objects.get(id=int(user_id))
                            recipients.add(user)
                        except (User.DoesNotExist, ValueError, TypeError):
                            pass

        # Remove the actor from recipients (they already know they deleted it)
        recipients.discard(actor)

        # Get ERP name
        erp_name = (
            snapshot.get("post", {}).get("title")
            or getattr(instance.post, "post_title", "")
            or getattr(instance.post, "post_name", "")
            or f"ERP #{instance.id}"
        )

        # Get deleter name
        deleter_name = (
            getattr(actor, "name", "")
            or getattr(actor, "username", "")
            or f"User #{actor.id}"
        )

        # Get deleter role
        deleter_role = "Provider" if actor == provider else "Receiver"

        # Create notifications for all recipients
        try:
            notifications = []
            for recipient in recipients:
                notification = Notification(
                    user=recipient,
                    title="ERP Card Deleted",
                    message=(
                        f'The ERP card "{erp_name}" has been deleted by {deleter_role} {deleter_name}. '
                        "This has been removed from your booking tracker."
                    ),
                )
                notifications.append(notification)

            if notifications:
                Notification.objects.bulk_create(notifications)
        except Exception:
            logger.exception("Failed to create deletion notifications for ERP %s", getattr(instance, "id", None))

        # Delete the ERP card
        instance.delete()


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


class ConnectionViewSet(viewsets.GenericViewSet):
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Connection.objects.filter(Q(requester=user) | Q(addressee=user)).select_related(
            "requester", "addressee"
        )

    def _pair_key(self, left_id, right_id):
        return tuple(sorted([int(left_id), int(right_id)]))

    def _serialize_users(self, user_ids):
        if not user_ids:
            return []
        users = User.objects.filter(id__in=list(user_ids)).order_by("name", "username", "id")
        return UserSerializer(users, many=True).data

    def _empty_member_role_ids(self):
        return {
            ConnectionRole.EXPERTISE: set(),
            ConnectionRole.SKILL_PROVIDER: set(),
            ConnectionRole.SUPPLIER: set(),
        }

    def _serialize_member_role_map(self, role_ids_map):
        role_ids_map = role_ids_map or {}
        return {
            ConnectionRole.EXPERTISE: self._serialize_users(role_ids_map.get(ConnectionRole.EXPERTISE) or set()),
            ConnectionRole.SKILL_PROVIDER: self._serialize_users(role_ids_map.get(ConnectionRole.SKILL_PROVIDER) or set()),
            ConnectionRole.SUPPLIER: self._serialize_users(role_ids_map.get(ConnectionRole.SUPPLIER) or set()),
        }

    @action(detail=False, methods=["get"])
    def overview(self, request):
        user = request.user
        queryset = self.get_queryset()

        accepted = queryset.filter(status=ConnectionStatus.ACCEPTED)
        pending_incoming = queryset.filter(status=ConnectionStatus.PENDING, addressee=user)
        pending_outgoing = queryset.filter(status=ConnectionStatus.PENDING, requester=user)

        manual_new_ids = set()
        member_role_ids = self._empty_member_role_ids()
        hired_ids = set()
        valid_roles = {choice for choice, _ in ConnectionRole.choices}

        for conn in accepted:
            other_id = conn.addressee_id if conn.requester_id == user.id else conn.requester_id
            if not other_id:
                continue

            other_id = int(other_id)
            manual_new_ids.add(other_id)

            requested_role = conn.requested_role if conn.requested_role in valid_roles else ConnectionRole.SKILL_PROVIDER

            if conn.requester_id == user.id:
                member_role_ids[requested_role].add(other_id)
            else:
                hired_ids.add(other_id)

        erp_items = ERP.objects.filter(Q(provider=user) | Q(receiver=user)).select_related(
            "provider", "receiver", "post__owner"
        )
        active_erp_items = erp_items.exclude(stage="Completed")

        live_ids = set()
        history_ids = set()

        for item in erp_items:
            participants = [
                item.provider_id,
                item.receiver_id,
                getattr(item.post, "owner_id", None),
            ]
            participants = {int(pid) for pid in participants if pid}
            if user.id not in participants:
                continue
            for pid in participants:
                if pid != user.id:
                    history_ids.add(pid)

        for item in active_erp_items:
            participants = [
                item.provider_id,
                item.receiver_id,
                getattr(item.post, "owner_id", None),
            ]
            participants = {int(pid) for pid in participants if pid}
            if user.id not in participants:
                continue
            for pid in participants:
                if pid != user.id:
                    live_ids.add(pid)

        recent_ids = history_ids.difference(live_ids)
        new_ids = manual_new_ids.difference(live_ids).difference(recent_ids)
        incoming_data = ConnectionSerializer(pending_incoming, many=True).data
        outgoing_data = ConnectionSerializer(pending_outgoing, many=True).data

        return Response(
            {
                "hired_connections": self._serialize_users(hired_ids),
                "live_connections": self._serialize_users(live_ids),
                "new_connections": self._serialize_users(new_ids),
                "recent_connections": self._serialize_users(recent_ids),
                "member_connections": self._serialize_member_role_map(member_role_ids),
                "incoming_requests": incoming_data,
                "outgoing_requests": outgoing_data,
            }
        )

    @action(detail=False, methods=["post"])
    def request(self, request):
        addressee_id = request.data.get("addressee_id")
        message = str(request.data.get("request_message", "")).strip()
        requested_role = str(request.data.get("requested_role", ConnectionRole.SKILL_PROVIDER)).strip().lower()

        valid_roles = {choice for choice, _ in ConnectionRole.choices}
        if requested_role not in valid_roles:
            return Response(
                {"detail": "requested_role must be one of expertise, skill_provider or supplier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            addressee_id = int(addressee_id)
        except (TypeError, ValueError):
            return Response({"detail": "Valid addressee_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if addressee_id == request.user.id:
            return Response({"detail": "You cannot request yourself."}, status=status.HTTP_400_BAD_REQUEST)

        addressee = User.objects.filter(id=addressee_id).first()
        if not addressee:
            return Response({"detail": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)

        direct = Connection.objects.filter(
            requester=request.user,
            addressee=addressee,
        ).order_by("-updated_at", "-id").first()
        reverse = Connection.objects.filter(
            requester=addressee,
            addressee=request.user,
        ).order_by("-updated_at", "-id").first()

        existing_any = Connection.objects.filter(
            Q(requester=request.user, addressee=addressee)
            | Q(requester=addressee, addressee=request.user)
        )

        if existing_any.filter(status=ConnectionStatus.ACCEPTED).exists():
            return Response({"detail": "You are already connected."}, status=status.HTTP_400_BAD_REQUEST)

        if existing_any.filter(status=ConnectionStatus.PENDING).exists():
            return Response({"detail": "A pending request already exists between both users."}, status=status.HTTP_400_BAD_REQUEST)

        # Re-open rejected requests instead of creating a new row, which can violate
        # unique_connection_direction when a historical row already exists.
        connection = direct
        if not connection and reverse and reverse.status == ConnectionStatus.REJECTED:
            connection = reverse

        if connection and connection.status == ConnectionStatus.REJECTED:
            connection.requester = request.user
            connection.addressee = addressee
            connection.status = ConnectionStatus.PENDING
            connection.requested_role = requested_role
            connection.request_message = message
            connection.accepted_at = None
            connection.save(
                update_fields=[
                    "requester",
                    "addressee",
                    "status",
                    "requested_role",
                    "request_message",
                    "accepted_at",
                    "updated_at",
                ]
            )
        else:
            connection = Connection.objects.create(
                requester=request.user,
                addressee=addressee,
                status=ConnectionStatus.PENDING,
                requested_role=requested_role,
                request_message=message,
            )

        sender_name = request.user.name or request.user.username or request.user.email
        role_label = connection.get_requested_role_display()
        Notification.objects.create(
            user=addressee,
            title="Connection Request",
            message=f"{sender_name} sent you a connection request for {role_label}.{f' Message: {message}' if message else ''}",
        )

        return Response(ConnectionSerializer(connection).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def respond(self, request, pk=None):
        connection = self.get_queryset().filter(id=pk).first()
        if not connection:
            return Response({"detail": "Connection request not found."}, status=status.HTTP_404_NOT_FOUND)

        if connection.addressee_id != request.user.id:
            raise PermissionDenied("Only request receiver can respond.")

        decision = str(request.data.get("decision", "")).strip().lower()
        if decision not in {"accept", "reject"}:
            return Response({"detail": "Decision must be accept or reject."}, status=status.HTTP_400_BAD_REQUEST)

        if decision == "accept":
            connection.status = ConnectionStatus.ACCEPTED
            connection.accepted_at = timezone.now()
            connection.save(update_fields=["status", "accepted_at", "updated_at"])

            sender_name = request.user.name or request.user.username or request.user.email
            Notification.objects.create(
                user=connection.requester,
                title="Connection Request Accepted",
                message=f"{sender_name} accepted your connection request.",
            )
            Notification.objects.create(
                user=request.user,
                title="Connection Added",
                message=f"You are now connected with {connection.requester.name or connection.requester.username or connection.requester.email}.",
            )
        else:
            connection.status = ConnectionStatus.REJECTED
            connection.save(update_fields=["status", "updated_at"])

            sender_name = request.user.name or request.user.username or request.user.email
            Notification.objects.create(
                user=connection.requester,
                title="Connection Request Rejected",
                message=f"{sender_name} rejected your connection request.",
            )

        return Response(ConnectionSerializer(connection).data)

    @action(detail=False, methods=["post"])
    def remove(self, request):
        target_user_id = request.data.get("target_user_id")

        try:
            target_user_id = int(target_user_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Valid target_user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target_user_id == request.user.id:
            return Response(
                {"detail": "You cannot remove yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        accepted_connections = Connection.objects.filter(
            Q(requester_id=request.user.id, addressee_id=target_user_id)
            | Q(requester_id=target_user_id, addressee_id=request.user.id),
            status=ConnectionStatus.ACCEPTED,
        )

        if not accepted_connections.exists():
            return Response(
                {"detail": "No accepted connection found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        removed_connections = list(accepted_connections)
        removed_count = len(removed_connections)

        target_user = User.objects.filter(id=target_user_id).first()
        actor_name = request.user.name or request.user.username or request.user.email
        target_name = (
            target_user.name or target_user.username or target_user.email
            if target_user
            else f"User #{target_user_id}"
        )

        role_labels = {
            ConnectionRole.EXPERTISE: "expertise member",
            ConnectionRole.SKILL_PROVIDER: "skill provider",
            ConnectionRole.SUPPLIER: "delivery person",
        }

        # When requester removes, they are leaving the connection from their requested role.
        requester_side = next(
            (
                conn for conn in removed_connections
                if conn.requester_id == request.user.id and conn.addressee_id == target_user_id
            ),
            None,
        )

        # When addressee removes, target requester is the hired/member role.
        addressee_side = next(
            (
                conn for conn in removed_connections
                if conn.requester_id == target_user_id and conn.addressee_id == request.user.id
            ),
            None,
        )

        if requester_side:
            actor_role_text = role_labels.get(requester_side.requested_role, "member")
            actor_message = f"You have removed connection with {target_name}."
            target_message = f"The {actor_role_text} {actor_name} has left your connection."
        elif addressee_side:
            actor_message = f"You have removed connection with {target_name}."
            target_message = f"{actor_name} removed your connection."
        else:
            actor_message = f"You have removed connection with {target_name}."
            target_message = f"{actor_name} removed your connection."

        accepted_connections.delete()

        Notification.objects.create(
            user=request.user,
            title="Connection Removed",
            message=actor_message,
        )

        if target_user:
            Notification.objects.create(
                user=target_user,
                title="Connection Removed",
                message=target_message,
            )

        return Response(
            {
                "detail": "Connection removed successfully.",
                "removed_count": removed_count,
                "target_user_id": target_user_id,
            }
        )
