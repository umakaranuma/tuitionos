from django.db import models
from apps.institutes.models import Institute

class Subject(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    grade = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return f'{self.name} (Grade {self.grade})'

class Teacher(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='teachers')
    name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Batch(models.Model):
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=200)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='batches')
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    academic_year = models.PositiveIntegerField()
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class BatchTeacherConfig(models.Model):
    batch = models.OneToOneField(Batch, on_delete=models.CASCADE, related_name='teacher_config')
    teacher_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
