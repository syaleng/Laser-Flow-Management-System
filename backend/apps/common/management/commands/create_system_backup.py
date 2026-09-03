from django.core.management.base import BaseCommand

from apps.common.backup_service import create_backup, get_backup, list_backups


class Command(BaseCommand):
    help = "Create a complete LaserFlow database and media backup."

    def add_arguments(self, parser):
        parser.add_argument("--retain", type=int, default=14)

    def handle(self, *args, **options):
        backup = create_backup("اتومات سیستم")
        retain = max(options["retain"], 1)
        for old_backup in list_backups()[retain:]:
            get_backup(old_backup["filename"]).unlink()
        self.stdout.write(self.style.SUCCESS(f"Created {backup['filename']}"))
