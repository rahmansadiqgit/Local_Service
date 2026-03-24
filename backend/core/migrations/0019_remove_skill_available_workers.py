from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0018_alter_user_whatsapp_link"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="skill",
            name="available_workers",
        ),
    ]
