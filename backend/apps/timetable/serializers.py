from rest_framework import serializers
from .models import TimetableSlot

class TimetableSlotSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = TimetableSlot
        fields = [
            'id', 'batch', 'batch_name', 'day_of_week',
            'start_time', 'end_time', 'room', 'notes',
        ]
