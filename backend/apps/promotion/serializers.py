from rest_framework import serializers
from .models import BatchPromotionMap

class BatchPromotionMapSerializer(serializers.ModelSerializer):
    source_batch_name = serializers.CharField(source='source_batch.name', read_only=True)
    target_batch_name = serializers.CharField(source='target_batch.name', read_only=True)

    class Meta:
        model = BatchPromotionMap
        fields = [
            'id', 'source_batch', 'source_batch_name',
            'target_batch', 'target_batch_name',
            'academic_year', 'is_confirmed', 'created_at',
        ]
