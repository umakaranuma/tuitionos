from rest_framework import serializers
from .models import BatchPromotionMap

class BatchPromotionMapSerializer(serializers.ModelSerializer):
    batch_name = serializers.SerializerMethodField()
    source_batch_name = serializers.SerializerMethodField()

    class Meta:
        model = BatchPromotionMap
        fields = [
            'id', 'institute', 'batch_code', 'source_batch_name', 'academic_year',
            'batch', 'batch_name', 'is_passout', 'created_at',
        ]
        read_only_fields = ['institute']

    def get_batch_name(self, obj):
        if obj.is_passout or obj.batch is None:
            return "🎓 Passout / Alumni"
        return f"{obj.batch.name} ({obj.batch.academic_year})"
        
    def get_source_batch_name(self, obj):
        from apps.students.models import StudentBatchEnrollment
        from_year = obj.academic_year - 1
        enrollment = StudentBatchEnrollment.objects.filter(batch_code=obj.batch_code, academic_year=from_year).first()
        if enrollment:
            return enrollment.batch.name
        return "Unknown Batch"
        
    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
