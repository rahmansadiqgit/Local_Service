from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    LogoutView,
    MeView,
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
    UserViewSet,
)

"""
| Router                   | path()                 |
| ------------------------ | ---------------------- |
| Used for ViewSets        | Used for APIView       |
| Auto generates CRUD URLs | Manual URL definition  |
| Resource-based           | Action-based           |
| REST style               | Custom logic endpoints |

🧠 When To Use Router?
Use router when:
You are using ViewSet or ModelViewSet
You want automatic CRUD endpoints
Your API is resource-based (REST style)
Like:
posts
users
products
ratings
notifications
All of these are resources.
"""

router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"skills", SkillViewSet, basename="skill")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"erp", ERPViewSet, basename="erp")
router.register(r"ratings", RatingViewSet, basename="rating")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"users", UserViewSet, basename="user")



"""
🟡 Why Not Use Router For Auth?

Because auth endpoints are:

Not resource-based

Not CRUD

They are action-based
"""
urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "auth/password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("auth/me/", MeView.as_view(), name="me"),
    path("users/profile/", ProfileView.as_view(), name="profile"),
    path("users/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("", include(router.urls)),
]
