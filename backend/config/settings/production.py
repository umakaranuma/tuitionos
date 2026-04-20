from .base import *
import dj_database_url, os
DEBUG = False
ALLOWED_HOSTS = ['*.tuitionos.lk', 'tuitionos.lk']
DATABASES = {'default': dj_database_url.parse(os.environ['DATABASE_URL'])}
CORS_ALLOWED_ORIGINS = ['https://admin.tuitionos.lk']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
