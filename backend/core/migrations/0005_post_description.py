from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_user_status_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="description",
            field=models.TextField(blank=True),
        ),
    ]
