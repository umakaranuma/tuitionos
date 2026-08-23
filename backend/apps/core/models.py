from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models

class User(AbstractUser):
    totp_secret = models.CharField(max_length=32, blank=True)
    is_totp_enabled = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='users/avatars/', null=True, blank=True)

    class Meta:
        db_table = 'users'


class ActivityLog(models.Model):
    """Audit trail of who changed what, institute-scoped. Not tied to a
    single app on purpose — settings edits, profile edits, and future
    actions all funnel through log_activity() below."""
    institute = models.ForeignKey(
        'institutes.Institute', on_delete=models.CASCADE, related_name='activity_logs',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activity_logs',
    )
    action = models.CharField(max_length=50)
    description = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.action}] {self.description}'


ACTIVITY_CATEGORIES = {
    'advances': ['advance_added', 'advance_updated', 'advance_deleted'],
    'salary': ['salary_payment_added', 'salary_payment_updated', 'salary_payment_deleted', 'salary_payment_marked_paid'],
    'institute': ['profile_updated', 'institute_updated', 'plan_changed'],
    'students': ['student_added', 'student_updated', 'student_deleted'],
    'exams': ['exam_added', 'exam_updated', 'exam_deleted'],
    'subjects': ['subject_added', 'subject_updated', 'subject_deleted'],
    'teachers': ['teacher_added', 'teacher_updated', 'teacher_deleted'],
    'batches': ['batch_added', 'batch_updated', 'batch_deleted'],
    'timetable': ['timetable_slot_added', 'timetable_slot_updated', 'timetable_slot_deleted'],
    'attendance': ['attendance_marked'],
    'fees': ['fee_marked_paid', 'fee_deleted'],
}


def log_activity(institute, user, action: str, description: str):
    """Fire-and-forget audit entry. Never raises — a logging failure
    shouldn't break the actual request it's describing."""
    if not institute:
        return
    try:
        ActivityLog.objects.create(institute=institute, user=user, action=action, description=description)
    except Exception:
        pass
