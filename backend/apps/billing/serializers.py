from rest_framework import serializers
from .models import Invoice, InstituteTransaction, InvoiceActivity, InvoicePayment


class InvoiceSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source='institute.name', read_only=True)
    payment_slip_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'institute', 'institute_name', 'amount', 'paid_amount', 'month',
            'status', 'paid_at', 'due_date', 'reference_note', 'payment_slip',
            'payment_slip_url', 'created_at',
        ]
        read_only_fields = ['paid_at', 'payment_slip_url']

    def get_payment_slip_url(self, obj):
        if not obj.payment_slip:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.payment_slip.url)
        return obj.payment_slip.url


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


class InvoicePaymentSerializer(serializers.ModelSerializer):
    slip_url = serializers.SerializerMethodField()

    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'amount', 'slip', 'slip_url', 'reference_note', 'actor',
            'is_advance', 'source_month', 'created_at',
        ]
        read_only_fields = ['slip_url']

    def get_slip_url(self, obj):
        if not obj.slip:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.slip.url)
        return obj.slip.url


class InvoiceActivitySerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = InvoiceActivity
        fields = [
            'id', 'action', 'action_label', 'detail', 'actor',
            'amount_snapshot', 'created_at',
        ]
