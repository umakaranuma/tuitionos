from django.db import models
from apps.students.models import Student
from apps.institutes.models import Institute

class NotificationLog(models.Model):
    CHANNEL_CHOICES = [('whatsapp', 'WhatsApp'), ('sms', 'SMS')]
    TYPE_CHOICES = [('attendance','Attendance'),('fee_reminder','Fee Reminder'),('fee_receipt','Fee Receipt'),('timetable','Timetable'),('annual_pdf','Annual PDF')]

    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='notification_logs')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    recipient_mobile = models.CharField(max_length=20)
    message_preview = models.TextField(blank=True)
    is_delivered = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)
    class Meta:
        db_table = 'notification_logs'
        ordering = ['-sent_at']

class Broadcast(models.Model):
    STATUS_CHOICES = [('scheduled', 'Scheduled'), ('sending', 'Sending'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='broadcasts')
    title = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    channel = models.CharField(max_length=20, choices=NotificationLog.CHANNEL_CHOICES, default='whatsapp')
    target_audience = models.CharField(max_length=100) # e.g. 'all', 'batch_x', 'due_fees'
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    scheduled_at = models.DateTimeField(null=True, blank=True) # Null means immediate
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'broadcasts'
        ordering = ['-created_at']
