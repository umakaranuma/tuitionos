"""Backfill qr_token on existing teacher rows."""
import uuid
from django.db import migrations


def forwards(apps, schema_editor):
    Teacher = apps.get_model('academics', 'Teacher')
    seen = set()
    for t in Teacher.objects.all():
        if not t.qr_token or t.qr_token in seen:
            t.qr_token = uuid.uuid4().hex
            t.save(update_fields=['qr_token'])
        seen.add(t.qr_token)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [('academics', '0005_qr_token')]
    operations = [migrations.RunPython(forwards, backwards)]
