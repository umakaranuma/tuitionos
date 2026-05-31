from rest_framework import serializers
from .models import BatchPromotionMap

class BatchPromotionMapSerializer(serializers.ModelSerializer):
    source_batch_name = serializers.SerializerMethodField()
    target_batch_name = serializers.SerializerMethodField()

    class Meta:
        model = BatchPromotionMap
        fields = [
            'id', 'source_batch', 'source_batch_name',
            'target_batch', 'target_batch_name',
            'academic_year', 'is_confirmed', 'created_at',
        ]

    def get_source_batch_name(self, obj):
        return f"{obj.source_batch.name} ({obj.source_batch.academic_year})"

    def get_target_batch_name(self, obj):
        return f"{obj.target_batch.name} ({obj.target_batch.academic_year})"
