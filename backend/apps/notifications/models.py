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
        ordering = ['-sent_at']
