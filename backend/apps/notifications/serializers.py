from rest_framework import serializers
from .models import NotificationLog, Broadcast

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

class BroadcastSerializer(serializers.ModelSerializer):
    class Meta:
        model = Broadcast
        fields = [
            'id', 'title', 'message', 'channel', 'target_audience',
            'status', 'scheduled_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
