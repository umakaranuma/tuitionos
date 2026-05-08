from django.db import models
from apps.students.models import Student
from apps.academics.models import Batch, Subject

class Attendance(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='attendance_records')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    is_present = models.BooleanField(default=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'attendance'
        unique_together = ('student', 'batch', 'date')
        ordering = ['-date']
