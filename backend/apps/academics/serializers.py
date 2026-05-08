from rest_framework import serializers
from .models import (
    Subject, Teacher, Batch, BatchTeacherConfig,
    Exam, ExamScheduleItem, ExamMark,
    TeacherPayment, TeacherAdvance,
)

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'grade', 'icon', 'color_bg', 'color_fg', 'is_active', 'created_at']

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = ['id', 'name', 'mobile', 'email', 'subject', 'monthly_salary', 'is_active', 'created_at']

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)

class BatchTeacherConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchTeacherConfig
        fields = ['teacher_fee_percent', 'notes']

class BatchSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True, default=None)
    student_count = serializers.SerializerMethodField()
    teacher_config = BatchTeacherConfigSerializer(required=False)

    class Meta:
        model = Batch
        fields = [
            'id', 'name', 'label', 'subject', 'subject_name',
            'teacher', 'teacher_name', 'academic_year', 'monthly_fee',
            'color', 'color_light', 'is_active', 'created_at',
            'teacher_config', 'student_count',
        ]

    def get_student_count(self, obj):
        return obj.enrollments.filter(status='active').count()

    def create(self, validated_data):
        teacher_config_data = validated_data.pop('teacher_config', None)
        validated_data['institute'] = self.context['request'].institute
        batch = super().create(validated_data)
        if teacher_config_data:
            BatchTeacherConfig.objects.create(batch=batch, **teacher_config_data)
        return batch

    def update(self, instance, validated_data):
        teacher_config_data = validated_data.pop('teacher_config', None)
        batch = super().update(instance, validated_data)
        if teacher_config_data:
            config, _ = BatchTeacherConfig.objects.get_or_create(batch=batch)
            for attr, value in teacher_config_data.items():
                setattr(config, attr, value)
            config.save()
        return batch

# ── Exam Serializers ──

class ExamScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamScheduleItem
        fields = ['id', 'date', 'subject', 'start_time', 'end_time']

class ExamSerializer(serializers.ModelSerializer):
    schedule = ExamScheduleItemSerializer(many=True, required=False)
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = Exam
        fields = [
            'id', 'name', 'year', 'batch', 'batch_name',
            'start_date', 'end_date', 'status', 'max_marks',
            'schedule', 'created_at',
        ]

    def create(self, validated_data):
        schedule_data = validated_data.pop('schedule', [])
        validated_data['institute'] = self.context['request'].institute
        exam = super().create(validated_data)
        for item in schedule_data:
            ExamScheduleItem.objects.create(exam=exam, **item)
        return exam

class ExamMarkSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = ExamMark
        fields = ['id', 'exam', 'student', 'student_name', 'subject', 'marks', 'max_marks']

# ── Teacher Payment Serializers ──

class TeacherPaymentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)

    class Meta:
        model = TeacherPayment
        fields = [
            'id', 'teacher', 'teacher_name', 'month', 'amount',
            'status', 'paid_date', 'method', 'reference_no',
            'payslip_file', 'notes', 'payment_type', 'advance_deduction',
            'created_at',
        ]

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)

class TeacherAdvanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)

    class Meta:
        model = TeacherAdvance
        fields = [
            'id', 'teacher', 'teacher_name', 'amount', 'request_date',
            'reason', 'status', 'disbursed_date', 'method', 'repaid_amount',
            'created_at',
        ]

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
