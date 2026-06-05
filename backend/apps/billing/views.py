from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import AdminOnly, InstituteOnly
from .models import Invoice, InstituteTransaction
from .serializers import InvoiceSerializer, InstituteTransactionSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """Admin-facing: Platform invoices sent to institutes."""
    queryset = Invoice.objects.select_related('institute').all()
    serializer_class = InvoiceSerializer
    permission_classes = [] # Allow all for now, restrict in production

    from rest_framework.decorators import action
    from rest_framework.response import Response
    from django.utils import timezone
    import datetime
    from apps.institutes.models import Institute, PlatformSettings

    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()
            
        current_date = timezone.now().date()
        first_day_of_month = current_date.replace(day=1)
        due_date = current_date + datetime.timedelta(days=7)

        active_institutes = Institute.objects.filter(status=Institute.STATUS_ACTIVE)
        generated_count = 0

        for institute in active_institutes:
            # Check if invoice for this month already exists
            if not Invoice.objects.filter(institute=institute, month=first_day_of_month).exists():
                if institute.plan == 'solo': amount = settings_obj.monthly_fee_solo
                elif institute.plan == 'institute': amount = settings_obj.monthly_fee_institute
                elif institute.plan == 'institute_pro': amount = settings_obj.monthly_fee_institute_pro
                else: amount = settings_obj.monthly_fee_institute

                Invoice.objects.create(
                    institute=institute,
                    amount=amount,
                    month=first_day_of_month,
                    status=Invoice.STATUS_PENDING,
                    due_date=due_date
                )
                generated_count += 1

        return self.Response({
            "message": f"Successfully generated {generated_count} monthly invoices.",
            "count": generated_count
        })


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
