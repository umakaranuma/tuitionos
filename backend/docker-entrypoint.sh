#!/bin/sh
# Runs at container start (not build time) so DATABASE_URL and friends —
# provided by the host as runtime env vars — are actually available. Safe to
# run on every deploy: migrate is idempotent, collectstatic --clear keeps
# staticfiles/ from accumulating stale hashed copies across releases.
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
