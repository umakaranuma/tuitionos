import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-prod')
APPEND_SLASH = False

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'storages',
    'django_celery_beat',
    'apps.core',
    'apps.institutes',
    'apps.billing',
    'apps.academics',
    'apps.students',
    'apps.attendance',
    'apps.fees',
    'apps.notifications',
    'apps.timetable',
    'apps.promotion',
    'apps.pdfs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # Serves STATIC_ROOT directly from the app process — no separate static
    # file server needed on a single-dyno host like Railway. Must sit right
    # after SecurityMiddleware per WhiteNoise's own setup docs.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'apps.core.middleware.TenantMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'config.wsgi.application'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Colombo'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cloudflare R2 (S3-compatible) for uploaded media — teacher/student photos,
# institute logos, user avatars. Applies in *every* environment (dev, test,
# production) whenever the R2_* vars are present, so local uploads land in
# the same bucket as production instead of an easily-forgotten local disk
# folder. If they're absent (e.g. a fresh clone with no .env yet), media
# just falls back to local disk — dev/test still work without R2 set up.
# production.py hard-requires these vars instead of allowing this fallback.
if os.environ.get('R2_ACCESS_KEY_ID'):
    STORAGES = {
        'default': {'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    AWS_ACCESS_KEY_ID = os.environ['R2_ACCESS_KEY_ID']
    AWS_SECRET_ACCESS_KEY = os.environ['R2_SECRET_ACCESS_KEY']
    AWS_STORAGE_BUCKET_NAME = os.environ['R2_BUCKET_NAME']
    AWS_S3_ENDPOINT_URL = os.environ['R2_ENDPOINT_URL']
    AWS_S3_REGION_NAME = 'auto'
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_ADDRESSING_STYLE = 'virtual'
    AWS_DEFAULT_ACL = None  # R2 ignores per-object S3 ACLs — public access is a bucket-level setting
    AWS_QUERYSTRING_AUTH = False  # serve plain public URLs, not SigV4-signed ones
    AWS_S3_FILE_OVERWRITE = False  # match local FileSystemStorage: never clobber a same-named upload
    AWS_S3_CUSTOM_DOMAIN = (
        os.environ['R2_PUBLIC_URL'].removeprefix('https://').removeprefix('http://').rstrip('/')
    )

from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-academic-year',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.StandardPagination',
    'PAGE_SIZE': 25,
}

CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_TIMEZONE = 'Asia/Colombo'

# Email Configuration
if os.environ.get('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
else:
    # Fallback to console for local development if no SMTP is configured
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@tuitionos.com')

# Base URL of the deployed institute-portal frontend, used to build links in
# outgoing emails (welcome/reset-password). Defaults to the local dev server;
# must be overridden in production or every emailed link points at localhost.
INSTITUTE_APP_URL = os.environ.get('INSTITUTE_APP_URL', 'http://localhost:3001')

AUTH_USER_MODEL = 'core.User'
