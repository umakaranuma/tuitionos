from rest_framework import serializers
from .models import Invoice, InstituteTransaction

class InvoiceSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source='institute.name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'institute', 'institute_name', 'amount', 'month',
            'status', 'paid_at', 'due_date', 'created_at',
        ]

class InstituteTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstituteTransaction
        fields = [
            'id', 'month', 'transaction_type', 'category', 'label',
            'amount', 'date', 'created_at',
        ]

    def create(self, validated_data):
        validated_data['institute'] = self.context['request'].institute
        return super().create(validated_data)
