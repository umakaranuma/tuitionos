from django.db import models
from apps.academics.models import Batch

class TimetableSlot(models.Model):
    DAY_CHOICES = [('0','Monday'),('1','Tuesday'),('2','Wednesday'),('3','Thursday'),('4','Friday'),('5','Saturday'),('6','Sunday')]
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='timetable_slots')
    day_of_week = models.CharField(max_length=1, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['day_of_week', 'start_time']
