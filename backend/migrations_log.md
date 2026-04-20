# Migrations Log

## 2026-04-18 â€” Initial scaffold
- All app models created (stub state)
- Run: python manage.py migrate
"@

New-File "backend/config/__init__.py" ""
New-File "backend/config/wsgi.py" @"
import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
application = get_wsgi_application()
