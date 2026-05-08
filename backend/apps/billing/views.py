from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import AdminOnly, InstituteOnly
from .models import Invoice, InstituteTransaction
from .serializers import InvoiceSerializer, InstituteTransactionSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """Admin-facing: Platform invoices sent to institutes."""
    queryset = Invoice.objects.select_related('institute').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, AdminOnly]


class InstituteTransactionViewSet(viewsets.ModelViewSet):
    """Institute-facing: Income/expense transactions for the Accounts page."""
    serializer_class = InstituteTransactionSerializer
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        qs = InstituteTransaction.objects.filter(institute=self.request.institute)
        month = self.request.query_params.get('month')
        tx_type = self.request.query_params.get('type')
        if month:
            qs = qs.filter(month=month)
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        return qs
