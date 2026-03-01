from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models




class User(AbstractUser):
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    profile_photo = models.ImageField(upload_to="profile_photos/", blank=True, null=True)
    location = models.CharField(max_length=255, blank=True)
    education_skills = models.TextField(blank=True)
    experience = models.TextField(blank=True)
    status = models.CharField(max_length=50, blank=True)
    supply_status = models.CharField(max_length=100, blank=True)
    demand_status = models.CharField(max_length=100, blank=True)
    facebook_link = models.URLField(blank=True)
    whatsapp_link = models.URLField(blank=True)

    class Role(models.TextChoices):
        CUSTOMER = "Customer", "Customer"
        SKILLED = "SkilledPerson", "Skilled Person"
        BUSINESS = "Business", "Business"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)

    def __str__(self) -> str:
        return self.username


class PostType(models.TextChoices):
    SUPPLY = "Supply", "Supply"
    DEMAND = "Demand", "Demand"


class ServiceType(models.TextChoices):
    SKILL = "Skill", "Skill"
    PRODUCT = "Product", "Product"


class Post(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="posts",
    )
    post_type = models.CharField(max_length=10, choices=PostType.choices)
    post_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    brand_company_name = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    service_type = models.CharField(max_length=10, choices=ServiceType.choices)
    image = models.ImageField(upload_to="post_images/", blank=True, null=True)
    website_link = models.URLField(blank=True)

    def __str__(self) -> str:
        return self.post_name


class Skill(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="skills")
    skill_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    available_workers = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.skill_name} ({self.post.post_name})"


class Product(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="products")
    product_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2)
    available_units = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.product_name} ({self.post.post_name})"


class ERPCategory(models.TextChoices):
    RECEIVED = "Received", "Received"
    PROVIDED = "Provided", "Provided"


class ERPStage(models.TextChoices):
    PENDING = "Pending", "Pending"
    ON_PROCESS = "On Process", "On Process"
    COMPLETED = "Completed", "Completed"


class ERP(models.Model):
    category = models.CharField(max_length=20, choices=ERPCategory.choices)
    stage = models.CharField(max_length=20, choices=ERPStage.choices, default=ERPStage.PENDING)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="erp_records")
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="provided_erp_records",
    )
    assigned_workers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_erp_records",
        blank=True,
    )
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pdf_slip = models.FileField(upload_to="erp_slips/", blank=True, null=True)

    def __str__(self) -> str:
        return f"{self.post.post_name} - {self.category}"


class Rating(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="ratings")
    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_ratings",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_ratings",
    )
    rating_value = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review_text = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.post.post_name} - {self.rating_value}"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self) -> str:
        return f"{self.user.username} - {self.title}"
