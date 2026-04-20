from django.db import models
from apps.students.models import Student
from apps.academics.models import Batch

class FeePayment(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid')]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_payments')
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='fee_payments')
    month = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    collected_by = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('student', 'batch', 'month')
        ordering = ['-month']
