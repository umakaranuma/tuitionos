from django.db import models
from apps.institutes.models import Institute
from apps.academics.models import Batch

class Student(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='students')
    name = models.CharField(max_length=200)
    parent_name = models.CharField(max_length=200, blank=True)
    parent_mobile = models.CharField(max_length=20)
    has_whatsapp = models.BooleanField(default=True)
    grade = models.CharField(max_length=50)
    is_free = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    join_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class StudentBatchEnrollment(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('archived', 'Archived'), ('deactivated', 'Deactivated')]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='enrollments')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    academic_year = models.PositiveIntegerField()
    promoted_at = models.DateTimeField(null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('student', 'batch', 'academic_year')
