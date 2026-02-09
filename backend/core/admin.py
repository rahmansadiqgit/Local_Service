from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ERP, Post, Product, Rating, Skill, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Localix Profile",
            {
                "fields": (
                    "name",
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
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Localix Profile",
            {
                "fields": (
                    "name",
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
            },
        ),
    )
    list_display = ("username", "email", "name", "role", "is_staff", "is_active")
    search_fields = ("username", "email", "name", "phone")
    list_filter = ("role", "is_staff", "is_active")


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("post_name", "post_type", "service_type", "location")
    search_fields = ("post_name", "brand_company_name", "location")
    list_filter = ("post_type", "service_type")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("skill_name", "post", "unit", "cost_per_unit", "available_workers")
    search_fields = ("skill_name", "post__post_name")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_name", "post", "unit", "cost_per_unit", "available_units")
    search_fields = ("product_name", "post__post_name")


@admin.register(ERP)
class ERPAdmin(admin.ModelAdmin):
    list_display = ("post", "category", "stage", "provider", "total_cost")
    list_filter = ("category", "stage")
    search_fields = ("post__post_name", "provider__username", "provider__email")
    filter_horizontal = ("assigned_workers",)


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("post", "provider", "customer", "rating_value")
    list_filter = ("rating_value",)
    search_fields = (
        "post__post_name",
        "provider__username",
        "customer__username",
    )
