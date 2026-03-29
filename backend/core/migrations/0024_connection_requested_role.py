from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0023_expertise_needed_budget_unit"),
    ]

    operations = [
        migrations.AddField(
            model_name="connection",
            name="requested_role",
            field=models.CharField(
                choices=[
                    ("expertise", "Expertise"),
                    ("skill_provider", "Skill Provider"),
                    ("supplier", "Delivery Man"),
                ],
                default="skill_provider",
                max_length=30,
            ),
        ),
    ]
