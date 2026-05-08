from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    totp_secret = models.CharField(max_length=32, blank=True)
    is_totp_enabled = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'users'
