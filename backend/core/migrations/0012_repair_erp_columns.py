from django.db import migrations


def add_missing_erp_columns(apps, schema_editor):
    table_name = "core_erp"
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        if connection.vendor == "sqlite":
            cursor.execute(f"PRAGMA table_info({table_name})")
            existing = {row[1] for row in cursor.fetchall()}
        else:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = %s
                """,
                [table_name],
            )
            existing = {row[0] for row in cursor.fetchall()}

    statements = []
    if "receiver_id" not in existing:
        statements.append(f"ALTER TABLE {table_name} ADD COLUMN receiver_id bigint NULL")
    if "created_at" not in existing:
        statements.append(f"ALTER TABLE {table_name} ADD COLUMN created_at datetime NULL")
    if "updated_at" not in existing:
        statements.append(f"ALTER TABLE {table_name} ADD COLUMN updated_at datetime NULL")
    if "is_configured" not in existing:
        statements.append(f"ALTER TABLE {table_name} ADD COLUMN is_configured bool NOT NULL DEFAULT 0")
    if "configuration_snapshot" not in existing:
        statements.append(f"ALTER TABLE {table_name} ADD COLUMN configuration_snapshot text NULL")

    for sql in statements:
        schema_editor.execute(sql)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_sync_erp_state_fields"),
    ]

    operations = [
        migrations.RunPython(add_missing_erp_columns, noop_reverse),
    ]
