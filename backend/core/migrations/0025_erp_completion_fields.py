from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
from django.utils import timezone


def fill_null_erp_updated_at(apps, schema_editor):
    ERP = apps.get_model("core", "ERP")
    ERP.objects.filter(updated_at__isnull=True).update(updated_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0024_connection_requested_role"),
    ]

    operations = [
        migrations.RunPython(fill_null_erp_updated_at, migrations.RunPython.noop),
        migrations.AddField(
            model_name="erp",
            name="completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="erp",
            name="completed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="completed_erp_records",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="erp",
            name="completion_comment",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="erp",
            name="completion_rating",
            field=models.PositiveSmallIntegerField(
                blank=True,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
    ]
