from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0022_remove_skill_unit"),
    ]

    operations = [
        migrations.AddField(
            model_name="expertise",
            name="needed_budget_unit",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
