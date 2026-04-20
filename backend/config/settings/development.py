from .base import *
import dj_database_url, os
DEBUG = True
ALLOWED_HOSTS = ['*']
DATABASES = {'default': dj_database_url.parse(os.environ.get('DATABASE_URL', 'mysql://tuitionos:devpassword@localhost:3306/tuitionos_dev'))}
CELERY_TASK_ALWAYS_EAGER = True
CORS_ALLOW_ALL_ORIGINS = True
