import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-key-not-for-production-1234567890")
os.environ.setdefault("JWT_SIGNING_KEY", "test-only-jwt-signing-key-not-for-production-1234567890")
os.environ.setdefault("DATABASE_URL", "sqlite:///test.sqlite3")

from .base import *  # noqa: E402,F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
DATABASES["default"]["CONN_MAX_AGE"] = 0  # noqa: F405
