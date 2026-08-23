from rest_framework import serializers
from .models import TimetableSlot

class TimetableSlotSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            'id', 'batch', 'batch_name', 'subject', 'subject_name', 
            'teacher', 'teacher_name', 'day_of_week',
            'start_time', 'end_time', 'room', 'notes',
        ]
