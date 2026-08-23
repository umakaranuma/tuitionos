"""Creates the platform's fynux-admin superuser (the one that logs into the
admin portal, not an institute account). Safe to re-run — no-ops if the
username already exists.

Local:   python scripts/seed/seed_admin.py
Railway: railway run --service <backend service> python scripts/seed/seed_admin.py
         (reuses whatever DJANGO_SETTINGS_MODULE/DATABASE_URL that service
         already has configured — pass SEED_ADMIN_* below to set real
         credentials instead of the local-only defaults)
"""
import os, sys, django

# Make `config.settings...` importable no matter where this script is
# invoked from — Python puts the *script's own* directory on sys.path, not
# the cwd, so running this from the repo root (or anywhere but backend/)
# used to fail with "No module named 'config'".
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "backend")
sys.path.insert(0, BACKEND_DIR)

# manage.py loads backend/.env before Django ever sees the environment —
# this script didn't, so DATABASE_URL (and everything else) silently fell
# back to production.py's/development.py's hardcoded defaults instead of
# your actual local .env. Only matters for local runs; on Railway the real
# env vars are already set on the process, so there's no .env file to miss.
from environs import Env
Env().read_env(os.path.join(BACKEND_DIR, ".env"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

# This project swaps in a custom user model (AUTH_USER_MODEL = 'core.User')
# — django.contrib.auth.models.User isn't even a real table here, importing
# it directly (as this script used to) fails the moment it's queried.
from django.contrib.auth import get_user_model
User = get_user_model()

username = os.environ.get("SEED_ADMIN_USERNAME", "admin")
email = os.environ.get("SEED_ADMIN_EMAIL", "admin@tuitionos.lk")
password = os.environ.get("Admin@1126")

if not password:
    if os.environ.get("DJANGO_SETTINGS_MODULE") == "config.settings.production":
        raise SystemExit(
            "Refusing to create a production admin with no SEED_ADMIN_PASSWORD set — "
            "pass one explicitly, e.g.:\n"
            "  SEED_ADMIN_PASSWORD='...' railway run python scripts/seed/seed_admin.py"
        )
    password = "admin123"  # fine for local dev only — never reaches this branch in production

if User.objects.filter(username=username).exists():
    print(f"'{username}' already exists — not touching it.")
else:
    User.objects.create_superuser(username, email, password)
    print(f"Created superuser '{username}' ({email}).")
