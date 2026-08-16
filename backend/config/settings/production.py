from .base import *
import dj_database_url, os
from django.core.exceptions import ImproperlyConfigured
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

# R2 is required in production — Railway's disk is ephemeral, so without it
# every upload vanishes on the next redeploy. base.py only wires it up when
# the R2_* vars are present; here we fail loudly instead if they're missing,
# since silently falling back to local disk would be a much worse surprise
# in production than an app that refuses to start.
if 'R2_ACCESS_KEY_ID' not in os.environ:
    raise ImproperlyConfigured(
        'R2_ACCESS_KEY_ID and friends must be set in production — see .env.example. '
        'Without them, uploaded media would silently be written to ephemeral disk.'
    )
