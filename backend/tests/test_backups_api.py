import zipfile
from pathlib import Path

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole


@pytest.mark.django_db(transaction=True)
def test_only_owner_can_create_list_and_download_complete_backup(settings):
    runtime = Path(settings.BASE_DIR) / "test-backups-runtime"
    settings.BACKUP_ROOT = runtime / "backups"
    settings.MEDIA_ROOT = runtime / "media"
    settings.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    (settings.MEDIA_ROOT / "sample.txt").write_text("laserflow", encoding="utf-8")
    owner = User.objects.create_user(
        email="backup-owner@example.com",
        password="Strong-Test-Password-123!",
        full_name="Backup Owner",
        role=UserRole.OWNER,
    )
    manager = User.objects.create_user(
        email="backup-manager@example.com",
        password="Strong-Test-Password-123!",
        full_name="Backup Manager",
        role=UserRole.MANAGER,
    )
    client = APIClient()
    client.force_authenticate(manager)
    assert client.post(reverse("backup-list-create")).status_code == 403

    client.force_authenticate(owner)
    created = client.post(reverse("backup-list-create"))
    assert created.status_code == 201
    filename = created.data["data"]["filename"]
    archive_path = settings.BACKUP_ROOT / filename
    assert archive_path.exists()
    with zipfile.ZipFile(archive_path) as archive:
        assert {"database.json", "manifest.json", "media/sample.txt"} <= set(
            archive.namelist()
        )

    listed = client.get(reverse("backup-list-create"))
    assert listed.status_code == 200
    assert listed.data["data"][0]["filename"] == filename
    downloaded = client.get(reverse("backup-detail", kwargs={"filename": filename}))
    assert downloaded.status_code == 200
    assert downloaded["Content-Type"] == "application/zip"
