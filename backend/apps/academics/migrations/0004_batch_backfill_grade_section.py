"""Backfill `grade` and `section` from the existing `name` field.

Parses "Grade 11 — A/L Science" → grade="Grade 11", section="A/L Science".
Falls back to (name, "") when no separator is present.
"""
import re
from django.db import migrations


SEP_RE = re.compile(r'\s*[—–·\-]\s*', re.UNICODE)


def split_name(name: str) -> tuple[str, str]:
    if not name:
        return '', ''
    parts = SEP_RE.split(name, maxsplit=1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return name.strip(), ''


def forwards(apps, schema_editor):
    Batch = apps.get_model('academics', 'Batch')
    for b in Batch.objects.all():
        if b.grade:
            continue  # already set
        # Prefer existing `label` as the grade when it's clearly a grade tag.
        if b.label and b.label.lower().startswith(('grade', 'a/l', 'o/l', 'class', 'std')):
            grade = b.label.strip()
            # If `name` extends beyond label, take the trailing part as section.
            if b.name and b.name.lower().startswith(grade.lower()):
                rest = b.name[len(grade):]
                _, section = split_name(grade + rest)
                section = section.strip()
            else:
                _, section = split_name(b.name)
        else:
            grade, section = split_name(b.name)
        b.grade = grade or b.name or 'Batch'
        b.section = section
        # Keep name/label in sync with the new canonical form.
        b.name = f'{b.grade} · {b.section}' if b.section else b.grade
        b.label = b.grade
        b.save(update_fields=['grade', 'section', 'name', 'label'])


def backwards(apps, schema_editor):
    # No-op — keep the populated columns; they're additive.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('academics', '0003_batch_grade_section'),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
