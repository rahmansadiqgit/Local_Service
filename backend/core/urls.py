from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ChangePasswordView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    ERPViewSet,
    NotificationViewSet,
    PostViewSet,
    ProductViewSet,
    RatingViewSet,
    SkillViewSet,
)

router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"erp", ERPViewSet, basename="erp")
router.register(r"ratings", RatingViewSet, basename="rating")
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("users/profile/", ProfileView.as_view(), name="profile"),
    path("users/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("", include(router.urls)),
]
