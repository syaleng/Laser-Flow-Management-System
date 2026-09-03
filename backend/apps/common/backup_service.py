import hashlib
import json
import shutil
import tempfile
import zipfile
from datetime import datetime
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone

BACKUP_PREFIX = "LaserFlow-Backup-"
EXCLUDES = ("contenttypes", "auth.permission", "admin.logentry", "sessions")


def backup_root() -> Path:
    root = Path(settings.BACKUP_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_path(filename: str) -> Path:
    if (
        Path(filename).name != filename
        or not filename.startswith(BACKUP_PREFIX)
        or not filename.endswith(".zip")
    ):
        raise ValueError("Invalid backup filename.")
    return backup_root() / filename


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def create_backup(actor_name: str) -> dict:
    output = StringIO()
    call_command(
        "dumpdata",
        exclude=EXCLUDES,
        natural_foreign=True,
        natural_primary=True,
        indent=2,
        stdout=output,
    )
    database_data = output.getvalue().encode("utf-8")
    created_at = timezone.now()
    filename = f"{BACKUP_PREFIX}{created_at.strftime('%Y-%m-%d-%H%M%S')}.zip"
    target = backup_root() / filename
    manifest = {
        "format": 1,
        "application": "LaserFlow Management System",
        "created_at": created_at.isoformat(),
        "created_by": actor_name,
        "database_sha256": _sha256(database_data),
    }
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("database.json", database_data)
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        media_root = Path(settings.MEDIA_ROOT)
        if media_root.exists():
            for path in media_root.rglob("*"):
                if path.is_file():
                    archive.write(path, Path("media") / path.relative_to(media_root))
    return describe_backup(target)


def describe_backup(path: Path) -> dict:
    stat = path.stat()
    created_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.get_current_timezone())
    try:
        with zipfile.ZipFile(path) as archive:
            manifest = json.loads(archive.read("manifest.json"))
            created_at = datetime.fromisoformat(manifest["created_at"])
            created_by = manifest.get("created_by", "—")
    except (KeyError, ValueError, json.JSONDecodeError, zipfile.BadZipFile):
        created_by = "—"
    return {
        "filename": path.name,
        "size": stat.st_size,
        "created_at": created_at,
        "created_by": created_by,
    }


def list_backups() -> list[dict]:
    return [
        describe_backup(path)
        for path in sorted(backup_root().glob(f"{BACKUP_PREFIX}*.zip"), reverse=True)
    ]


def get_backup(filename: str) -> Path:
    path = _safe_path(filename)
    if not path.is_file():
        raise FileNotFoundError(filename)
    return path


def delete_backup(filename: str) -> None:
    get_backup(filename).unlink()


def validate_archive(path: Path) -> tuple[dict, bytes]:
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if "manifest.json" not in names or "database.json" not in names:
            raise ValueError("دا د LaserFlow معتبر Backup نه دی.")
        if any(name.startswith("/") or ".." in Path(name).parts for name in names):
            raise ValueError("Backup خوندي فایلونه نه لري.")
        manifest = json.loads(archive.read("manifest.json"))
        database_data = archive.read("database.json")
        if manifest.get("application") != "LaserFlow Management System" or manifest.get(
            "database_sha256"
        ) != _sha256(database_data):
            raise ValueError("Backup خراب شوی یا بدل شوی دی.")
    return manifest, database_data


def restore_backup(path: Path) -> dict:
    manifest, database_data = validate_archive(path)
    media_root = Path(settings.MEDIA_ROOT)
    media_root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="laserflow-restore-") as temp_name:
        temp = Path(temp_name)
        fixture = temp / "database.json"
        fixture.write_bytes(database_data)
        staged_media = temp / "media"
        previous_media = temp / "previous-media"
        with zipfile.ZipFile(path) as archive:
            for member in archive.infolist():
                if member.filename.startswith("media/"):
                    archive.extract(member, temp)
        media_moved = False
        try:
            with transaction.atomic():
                call_command("flush", interactive=False, verbosity=0)
                call_command("loaddata", str(fixture), verbosity=0)
                if media_root.exists():
                    shutil.move(str(media_root), str(previous_media))
                if staged_media.exists():
                    shutil.move(str(staged_media), str(media_root))
                else:
                    media_root.mkdir(parents=True, exist_ok=True)
                media_moved = True
        except Exception:
            if media_moved and media_root.exists():
                shutil.rmtree(media_root)
            if previous_media.exists():
                shutil.move(str(previous_media), str(media_root))
            raise
    return manifest
