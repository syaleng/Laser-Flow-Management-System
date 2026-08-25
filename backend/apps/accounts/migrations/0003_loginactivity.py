import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_user_accounts_user_email_ci_unique")]

    operations = [
        migrations.CreateModel(
            name="LoginActivity",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("username", models.CharField(db_index=True, max_length=254)),
                ("successful", models.BooleanField(db_index=True)),
                (
                    "user_role",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("OWNER", "Owner"),
                            ("MANAGER", "Manager"),
                            ("OPERATOR", "Operator"),
                            ("VIEWER", "Viewer"),
                        ],
                        max_length=20,
                    ),
                ),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, max_length=500)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="login_activities",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="loginactivity",
            index=models.Index(
                fields=["-created_at", "successful"], name="login_activity_time_status_idx"
            ),
        ),
    ]
