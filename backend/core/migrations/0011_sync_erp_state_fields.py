from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_erp_configuration_snapshot"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name="erp",
                    name="receiver",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="received_erp_records",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name="erp",
                    name="created_at",
                    field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="erp",
                    name="updated_at",
                    field=models.DateTimeField(auto_now=True),
                ),
                migrations.AddField(
                    model_name="erp",
                    name="is_configured",
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
