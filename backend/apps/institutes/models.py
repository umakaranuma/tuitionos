from django.db import models
from django.conf import settings

class Institute(models.Model):
    PLAN_SOLO = 'solo'
    PLAN_INSTITUTE = 'institute'
    PLAN_INSTITUTE_PRO = 'institute_pro'
    PLAN_CHOICES = [(PLAN_SOLO, 'Solo'), (PLAN_INSTITUTE, 'Institute'), (PLAN_INSTITUTE_PRO, 'Institute Pro')]
    STATUS_PENDING = 'pending'
    STATUS_TRIAL = 'trial'
    STATUS_ACTIVE = 'active'
    STATUS_PAUSED = 'paused'
    STATUS_SUSPENDED = 'suspended'
    STATUS_DEACTIVATED = 'deactivated'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_TRIAL, 'Trial'), 
        (STATUS_ACTIVE, 'Active'), 
        (STATUS_PAUSED, 'Paused'),
        (STATUS_SUSPENDED, 'Suspended'),
        (STATUS_DEACTIVATED, 'Deactivated')
    ]

    name = models.CharField(max_length=200)
    subdomain = models.SlugField(max_length=63, unique=True)
    owner_name = models.CharField(max_length=200)
    owner_email = models.EmailField()
    owner_mobile = models.CharField(max_length=20)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_INSTITUTE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    is_active = models.BooleanField(default=True)
    trial_ends_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'institutes'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.subdomain})'

class InstituteUser(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='institute_profile')
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='users')
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('staff', 'Staff')], default='admin')
    
    class Meta:
        db_table = 'institute_users'
        
    def __str__(self):
        return f'{self.user.username} @ {self.institute.name}'

class PlatformSettings(models.Model):
    monthly_fee_solo = models.DecimalField(max_digits=10, decimal_places=2, default=1500)
    monthly_fee_institute = models.DecimalField(max_digits=10, decimal_places=2, default=3000)
    monthly_fee_institute_pro = models.DecimalField(max_digits=10, decimal_places=2, default=6000)
    trial_days = models.PositiveIntegerField(default=14)
    suspension_grace_days = models.PositiveIntegerField(default=7)

    class Meta:
        db_table = 'platform_settings'
        verbose_name = 'Platform Settings'
