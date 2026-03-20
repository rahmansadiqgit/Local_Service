from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_post_post_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="erp",
            name="configuration_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
