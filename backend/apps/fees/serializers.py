from rest_framework import serializers
from .models import FeePayment

class FeePaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    batch_name = serializers.CharField(source='batch.name', read_only=True)

    class Meta:
        model = FeePayment
        fields = [
            'id', 'student', 'student_name', 'batch', 'batch_name',
            'month', 'amount', 'status', 'paid_at', 'collected_by',
            'created_at',
        ]
