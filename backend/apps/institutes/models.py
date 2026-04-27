from django.db import models

class Institute(models.Model):
    PLAN_BASIC = 'basic'
    PLAN_PREMIUM = 'premium'
    PLAN_CHOICES = [(PLAN_BASIC, 'Basic'), (PLAN_PREMIUM, 'Premium')]
    STATUS_TRIAL = 'trial'
    STATUS_ACTIVE = 'active'
    STATUS_SUSPENDED = 'suspended'
    STATUS_CHOICES = [(STATUS_TRIAL, 'Trial'), (STATUS_ACTIVE, 'Active'), (STATUS_SUSPENDED, 'Suspended')]

    name = models.CharField(max_length=200)
    subdomain = models.SlugField(max_length=63, unique=True)
    owner_name = models.CharField(max_length=200)
    owner_email = models.EmailField()
    owner_mobile = models.CharField(max_length=20)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_BASIC)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIAL)
    is_active = models.BooleanField(default=True)
    trial_ends_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.subdomain})'

class InstituteUser(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE, related_name='institute_profile')
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='users')
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('staff', 'Staff')], default='admin')
    
    def __str__(self):
        return f'{self.user.username} @ {self.institute.name}'

class PlatformSettings(models.Model):
    monthly_fee_basic = models.DecimalField(max_digits=10, decimal_places=2, default=2500)
    monthly_fee_premium = models.DecimalField(max_digits=10, decimal_places=2, default=4500)
    trial_days = models.PositiveIntegerField(default=14)
    suspension_grace_days = models.PositiveIntegerField(default=7)

    class Meta:
        verbose_name = 'Platform Settings'
