from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_connection"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="skill",
            name="unit",
        ),
    ]
