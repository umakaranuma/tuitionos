from rest_framework import serializers
from .models import Student, StudentBatchEnrollment

class StudentSerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'name', 'initials', 'parent_name', 'parent_mobile',
            'has_whatsapp', 'grade', 'is_free', 'is_active',
            'join_date', 'created_at',
        ]

    def get_initials(self, obj):
        parts = obj.name.split()
        return ''.join([p[0].upper() for p in parts[:2]]) if parts else ''

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)

class StudentBatchEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = StudentBatchEnrollment
        fields = [
            'id', 'student', 'student_name', 'batch', 'batch_name',
            'status', 'academic_year', 'promoted_at', 'enrolled_at',
        ]
