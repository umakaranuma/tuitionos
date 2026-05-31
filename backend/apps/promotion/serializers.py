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
        enrollment = StudentBatchEnrollment.objects.filter(batch_code=obj.batch_code).order_by('-academic_year').first()
        if enrollment:
            return f"{enrollment.batch.name} (Code: {obj.batch_code})"
        return obj.batch_code
        
    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
