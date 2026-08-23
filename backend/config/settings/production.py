from .base import *
import dj_database_url, os
from django.core.exceptions import ImproperlyConfigured
DEBUG = False

# Configurable rather than hardcoded to "tuitionos.lk" — that's a working
# name, not necessarily the domain this actually ends up deployed under.
SITE_DOMAIN = os.environ.get('SITE_DOMAIN', 'tuitionos.lk')
ALLOWED_HOSTS = [f'*.{SITE_DOMAIN}', SITE_DOMAIN]
# Railway auto-injects this for any service with public networking on — lets
# `manage.py check`/requests work against the raw *.up.railway.app URL
# before a custom domain is wired up, without it Django 400s every request
# with DisallowedHost until DNS is in place.
if os.environ.get('RAILWAY_PUBLIC_DOMAIN'):
    ALLOWED_HOSTS.append(os.environ['RAILWAY_PUBLIC_DOMAIN'])
DATABASES = {'default': dj_database_url.parse(os.environ['DATABASE_URL'])}

# Every institute gets its own subdomain (stpatricks.<domain>, etc.), so a
# fixed origin list can't work here — only admin.<domain> was ever listed,
# which meant every institute frontend was silently CORS-blocked in
# production. Matches on any single-label subdomain of SITE_DOMAIN, same
# shape as ALLOWED_HOSTS above. Also allow *.vercel.app — every frontend
# starts out there before a custom domain is wired, and preview deploys
# (one per PR) live there permanently. Safe to leave on even afterward:
# auth here is a bearer token attached manually per-request, not a cookie,
# so a stray vercel.app origin can't silently ride along with credentials
# the way it could with cookie-based auth.
CORS_ALLOWED_ORIGIN_REGEXES = [
    rf'^https://([a-zA-Z0-9-]+\.)?{SITE_DOMAIN.replace(".", r"\.")}$',
    r'^https://[a-zA-Z0-9-]+\.vercel\.app$',
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
