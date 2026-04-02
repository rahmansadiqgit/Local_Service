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
    whatsapp_link = models.CharField(max_length=30, blank=True)

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


class Post(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="posts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    post_type = models.CharField(max_length=10, choices=PostType.choices)
    post_name = models.CharField(max_length=255)
    post_title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    brand_company_name = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to="post_images/", blank=True, null=True)
    website_link = models.URLField(max_length=2048, blank=True)

    def __str__(self) -> str:
        return self.post_name


class Skill(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="skills")
    skill_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.skill_name} ({self.post.post_name})"


class Expertise(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="expertises")
    name = models.CharField(max_length=255)
    experience = models.CharField(max_length=100)
    unit = models.CharField(max_length=50)
    needed_budget_unit = models.PositiveIntegerField(default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    available_person = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.name} ({self.post.post_name})"


class Product(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="products")
    product_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
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
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_erp_records",
    )
    assigned_workers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_erp_records",
        blank=True,
    )
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    configuration_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_configured = models.BooleanField(default=False)
    pdf_slip = models.FileField(upload_to="erp_slips/", blank=True, null=True)
    completion_comment = models.TextField(blank=True)
    completion_rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_erp_records",
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.post.post_name} - {self.category}"


class ERPMessage(models.Model):
    erp = models.ForeignKey(ERP, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="erp_messages",
    )
    message = models.TextField()
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"ERP #{self.erp_id} by {self.sender_id}"


class ConnectionStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    ACCEPTED = "Accepted", "Accepted"
    REJECTED = "Rejected", "Rejected"


class ConnectionRole(models.TextChoices):
    EXPERTISE = "expertise", "Expertise"
    SKILL_PROVIDER = "skill_provider", "Skill Provider"
    SUPPLIER = "supplier", "Delivery Man"


class Connection(models.Model):
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_connections",
    )
    addressee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_connections",
    )
    status = models.CharField(
        max_length=20,
        choices=ConnectionStatus.choices,
        default=ConnectionStatus.PENDING,
    )
    requested_role = models.CharField(
        max_length=30,
        choices=ConnectionRole.choices,
        default=ConnectionRole.SKILL_PROVIDER,
    )
    request_message = models.TextField(blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["requester", "addressee"], name="unique_connection_direction"),
        ]
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return f"{self.requester_id}->{self.addressee_id} ({self.status})"


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


class ProblemReport(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="problem_reports",
    )
    subject = models.CharField(max_length=255)
    details = models.TextField()
    reporter_name = models.CharField(max_length=255, blank=True)
    reporter_email = models.EmailField()
    reporter_phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.reporter_email} - {self.subject}"

