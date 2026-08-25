from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DESIGN_EXTENSIONS = {".cdr", ".ai", ".svg", ".dxf", ".pdf"}


def _validate_file(file, extensions: set[str], label: str) -> None:
    extension = Path(file.name).suffix.lower()
    if extension not in extensions:
        allowed = ", ".join(sorted(extension.lstrip(".") for extension in extensions))
        raise ValidationError(f"{label} must be one of: {allowed}.")
    maximum = settings.MAX_DESIGN_UPLOAD_SIZE_MB * 1024 * 1024
    if file.size > maximum:
        raise ValidationError(f"{label} cannot exceed {settings.MAX_DESIGN_UPLOAD_SIZE_MB} MB.")


def validate_reference_image(file) -> None:
    _validate_file(file, IMAGE_EXTENSIONS, "Customer reference image")


def validate_preview_image(file) -> None:
    _validate_file(file, IMAGE_EXTENSIONS, "Design preview image")


def validate_design_file(file) -> None:
    _validate_file(file, DESIGN_EXTENSIONS, "Design file")
