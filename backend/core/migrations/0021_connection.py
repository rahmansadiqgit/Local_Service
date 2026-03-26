from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0020_erpmessage"),
    ]

    operations = [
        migrations.CreateModel(
            name="Connection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[("Pending", "Pending"), ("Accepted", "Accepted"), ("Rejected", "Rejected")],
                        default="Pending",
                        max_length=20,
                    ),
                ),
                ("request_message", models.TextField(blank=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "addressee",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="received_connections", to=settings.AUTH_USER_MODEL),
                ),
                (
                    "requester",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sent_connections", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "ordering": ["-updated_at", "-id"],
            },
        ),
        migrations.AddConstraint(
            model_name="connection",
            constraint=models.UniqueConstraint(fields=("requester", "addressee"), name="unique_connection_direction"),
        ),
    ]
