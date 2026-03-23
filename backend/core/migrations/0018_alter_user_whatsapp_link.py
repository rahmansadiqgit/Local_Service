import re

from django.db import migrations, models


def normalize_whatsapp_numbers(apps, schema_editor):
    User = apps.get_model("core", "User")
    for user in User.objects.only("id", "whatsapp_link"):
        raw = str(user.whatsapp_link or "").strip()
        digits_only = re.sub(r"\D", "", raw)
        if raw != digits_only:
            user.whatsapp_link = digits_only
            user.save(update_fields=["whatsapp_link"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_product_description_skill_description"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="whatsapp_link",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.RunPython(normalize_whatsapp_numbers, migrations.RunPython.noop),
    ]
