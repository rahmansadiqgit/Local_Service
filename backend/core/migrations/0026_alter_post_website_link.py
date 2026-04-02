from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0025_erp_completion_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="post",
            name="website_link",
            field=models.URLField(blank=True, max_length=2048),
        ),
    ]
