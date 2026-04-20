import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()
from django.contrib.auth.models import User
if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser("admin", "admin@tuitionos.lk", "admin123")
    print("Created: admin / admin123")
else:
    print("Superuser already exists.")
