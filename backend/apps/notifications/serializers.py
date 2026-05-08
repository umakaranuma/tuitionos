from rest_framework import serializers
from .models import NotificationLog

class NotificationLogSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True, default=None)

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'student', 'student_name', 'channel', 'notification_type',
            'recipient_mobile', 'message_preview', 'is_delivered',
            'sent_at', 'error_message',
        ]

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
