import tempfile
from pathlib import Path

from django.contrib.auth import authenticate
from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsOwner
from apps.daily_journal.models import JournalActivity

from .backup_service import create_backup, delete_backup, get_backup, list_backups, restore_backup


class BackupListCreateView(APIView):
    permission_classes = [IsOwner]

    def get(self, request):
        return Response({"data": list_backups()})

    def post(self, request):
        result = create_backup(request.user.full_name or request.user.email)
        JournalActivity.objects.create(
            entity_type="system_backup",
            entity_id=request.user.id,
            action="created",
            changed_fields={"filename": result["filename"]},
            actor=request.user,
        )
        return Response({"data": result}, status=status.HTTP_201_CREATED)


class BackupDetailView(APIView):
    permission_classes = [IsOwner]

    def get(self, request, filename):
        try:
            path = get_backup(filename)
        except (ValueError, FileNotFoundError):
            return Response({"error": {"message": "Backup ونه موندل شو."}}, status=404)
        return FileResponse(
            path.open("rb"), as_attachment=True, filename=path.name, content_type="application/zip"
        )

    def delete(self, request, filename):
        try:
            delete_backup(filename)
        except (ValueError, FileNotFoundError):
            return Response({"error": {"message": "Backup ونه موندل شو."}}, status=404)
        JournalActivity.objects.create(
            entity_type="system_backup",
            entity_id=request.user.id,
            action="deleted",
            changed_fields={"filename": filename},
            actor=request.user,
        )
        return Response(status=204)


class BackupRestoreView(APIView):
    permission_classes = [IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        owner_email = request.user.email
        uploaded = request.FILES.get("backup")
        if not uploaded or request.data.get("confirmation") != "RESTORE":
            return Response(
                {"error": {"message": "Backup فایل او RESTORE تایید ضروري دي."}}, status=400
            )
        password = request.data.get("password", "")
        if authenticate(request=request, username=request.user.email, password=password) is None:
            return Response({"error": {"message": "ستاسو Password ناسم دی."}}, status=400)
        if not uploaded.name.lower().endswith(".zip") or uploaded.size > 2 * 1024 * 1024 * 1024:
            return Response({"error": {"message": "د Backup فایل معتبر نه دی."}}, status=400)
        with tempfile.TemporaryDirectory(prefix="laserflow-upload-") as temp_name:
            path = Path(temp_name) / "backup.zip"
            with path.open("wb") as destination:
                for chunk in uploaded.chunks():
                    destination.write(chunk)
            try:
                manifest = restore_backup(path)
            except Exception:
                return Response(
                    {"error": {"message": "Restore ناکام شو؛ Backup معتبر او بشپړ وګورئ."}},
                    status=400,
                )
        from apps.accounts.models import User

        restored_owner = User.objects.filter(email=owner_email).first()
        if restored_owner:
            JournalActivity.objects.create(
                entity_type="system_backup",
                entity_id=restored_owner.id,
                action="restored",
                changed_fields={"created_at": manifest.get("created_at")},
                actor=restored_owner,
            )
        return Response({"data": {"restored": True, "created_at": manifest.get("created_at")}})
