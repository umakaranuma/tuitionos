from django.db import models
from apps.students.models import Student
from apps.institutes.models import Institute


class AdminNotification(models.Model):
    """Platform-admin notifications surfaced in the bell + Alerts screen.
    Persisted so read state survives refreshes and history is paginable."""
    KIND_PAYMENT_OVERDUE = 'payment_overdue'
    KIND_PAYMENT_DUE_TODAY = 'payment_due_today'
    KIND_TRIAL_EXPIRING = 'trial_expiring'
    KIND_UPGRADE_REQUEST = 'upgrade_request'
    KIND_DOWNGRADE_REQUEST = 'downgrade_request'
    KIND_INSTITUTE_JOINED = 'institute_joined'
    KIND_PAYMENT_RECEIVED = 'payment_received'
    KIND_INFO = 'info'
    KIND_CHOICES = [
        (KIND_PAYMENT_OVERDUE, 'Payment Overdue'),
        (KIND_PAYMENT_DUE_TODAY, 'Payment Due Today'),
        (KIND_TRIAL_EXPIRING, 'Trial Expiring'),
        (KIND_UPGRADE_REQUEST, 'Upgrade Request'),
        (KIND_DOWNGRADE_REQUEST, 'Downgrade Request'),
        (KIND_INSTITUTE_JOINED, 'Institute Joined'),
        (KIND_PAYMENT_RECEIVED, 'Payment Received'),
        (KIND_INFO, 'Info'),
    ]
    SEVERITY_CHOICES = [
        ('error', 'Error'), ('warn', 'Warning'), ('info', 'Info'),
        ('success', 'Success'), ('upgrade', 'Upgrade'), ('downgrade', 'Downgrade'),
    ]

    kind = models.CharField(max_length=40, choices=KIND_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    title = models.CharField(max_length=200)
    sub = models.CharField(max_length=300, blank=True)
    institute = models.ForeignKey(
        Institute, on_delete=models.CASCADE, null=True, blank=True, related_name='admin_notifications',
    )
    # Idempotency key — same key won't create duplicate alerts (e.g. one overdue
    # alert per institute+month). Set by the sync routine.
    dedupe_key = models.CharField(max_length=120, blank=True, default='', db_index=True)
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_dismissed = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'admin_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.kind}] {self.title}'

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
