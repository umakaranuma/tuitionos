"""Backfill qr_token on existing rows. Each row gets a fresh uuid4 hex."""
import uuid
from django.db import migrations


def forwards(apps, schema_editor):
    Student = apps.get_model('students', 'Student')
    # AddField with a callable default runs the function ONCE for the whole
    # operation, so every existing row ended up with the same token. Regenerate
    # them all so the unique constraint can be applied.
    seen = set()
    for s in Student.objects.all():
        if not s.qr_token or s.qr_token in seen:
            s.qr_token = uuid.uuid4().hex
            s.save(update_fields=['qr_token'])
        seen.add(s.qr_token)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [('students', '0002_qr_token')]
    operations = [migrations.RunPython(forwards, backwards)]
