from .base import *
import dj_database_url, os
DEBUG = False

# Configurable rather than hardcoded to "tuitionos.lk" — that's a working
# name, not necessarily the domain this actually ends up deployed under.
SITE_DOMAIN = os.environ.get('SITE_DOMAIN', 'tuitionos.lk')
ALLOWED_HOSTS = [f'*.{SITE_DOMAIN}', SITE_DOMAIN]
DATABASES = {'default': dj_database_url.parse(os.environ['DATABASE_URL'])}

# Every institute gets its own subdomain (stpatricks.<domain>, etc.), so a
# fixed origin list can't work here — only admin.<domain> was ever listed,
# which meant every institute frontend was silently CORS-blocked in
# production. Matches on any single-label subdomain of SITE_DOMAIN, same
# shape as ALLOWED_HOSTS above.
CORS_ALLOWED_ORIGIN_REGEXES = [
    rf'^https://([a-zA-Z0-9-]+\.)?{SITE_DOMAIN.replace(".", r"\.")}$',
]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Cloudflare R2 (S3-compatible) for uploaded media — teacher/student photos,
# institute logos, user avatars. Railway's own disk is ephemeral, so without
# this every upload would vanish on the next redeploy or restart. Static
# files (Django admin's CSS/JS) stay on WhiteNoise/local disk — only media
# needs to survive across deploys.
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
