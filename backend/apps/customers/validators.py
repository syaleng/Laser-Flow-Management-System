import re

from django.core.exceptions import ValidationError

E164_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_whatsapp_number(value: str) -> str:
    value = value.strip()
    if not value:
        return ""

    had_plus = value.startswith("+")
    digits = re.sub(r"\D", "", value)
    if digits.startswith("00"):
        normalized = f"+{digits[2:]}"
    elif digits.startswith("0"):
        normalized = f"+93{digits[1:]}"
    elif len(digits) == 9 and digits.startswith("7"):
        normalized = f"+93{digits}"
    elif digits.startswith("93") or had_plus:
        normalized = f"+{digits}"
    else:
        normalized = f"+{digits}"

    if not E164_PATTERN.fullmatch(normalized):
        raise ValidationError(
            "Enter a valid WhatsApp number, for example +93700123456 or 0700123456."
        )
    return normalized
