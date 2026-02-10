from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_post_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="supply_status",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="user",
            name="demand_status",
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
