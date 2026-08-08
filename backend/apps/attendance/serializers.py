from rest_framework import serializers
from .models import Attendance

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_name', 'batch', 'subject', 'subject_name',
            'date', 'is_present', 'marked_at',
        ]

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject_id else None
