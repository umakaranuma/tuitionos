import uuid
from django.db import models
from apps.institutes.models import Institute
from apps.academics.models import Batch


def _gen_token() -> str:
    return uuid.uuid4().hex


class Student(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='students')
    name = models.CharField(max_length=200)
    parent_name = models.CharField(max_length=200, blank=True)
    parent_mobile = models.CharField(max_length=20, blank=True)
    has_whatsapp = models.BooleanField(default=True)
    batch_code = models.CharField(max_length=100, default='DEFAULT')
    is_free = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    join_date = models.DateField(null=True, blank=True)
    image = models.ImageField(upload_to='students/', null=True, blank=True)
    # Stable opaque token used by the QR / ID card. Generated once on save and
    # never rewritten — keeps printed cards valid forever.
    qr_token = models.CharField(max_length=32, unique=True, db_index=True, default=_gen_token)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'students'
    def __str__(self): return self.name

class StudentBatchEnrollment(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('archived', 'Archived'), ('deactivated', 'Deactivated')]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='enrollments')
    batch_code = models.CharField(max_length=100, default='DEFAULT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    academic_year = models.PositiveIntegerField()
    promoted_at = models.DateTimeField(null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'student_batch_enrollments'
        unique_together = ('student', 'batch', 'academic_year')
