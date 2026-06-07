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

    def get_queryset(self):
        qs = super().get_queryset()
        year_str = self.request.query_params.get('year', 'all')
        month_str = self.request.query_params.get('month', 'all')
        
        if year_str != 'all':
            try:
                y = int(year_str)
                qs = qs.filter(month__year=y)
                if month_str != 'all':
                    m = int(month_str)
                    qs = qs.filter(month__month=m)
            except ValueError:
                pass
            
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        from django.db.models import Sum
        total_mrr = queryset.aggregate(t=Sum('amount'))['t'] or 0
        collected = queryset.filter(status='paid').aggregate(t=Sum('amount'))['t'] or 0
        outstanding = float(total_mrr) - float(collected)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['stats'] = {
                'total_mrr': float(total_mrr),
                'collected': float(collected),
                'outstanding': outstanding
            }
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'stats': {
                'total_mrr': float(total_mrr),
                'collected': float(collected),
                'outstanding': outstanding
            }
        })

    def perform_update(self, serializer):
        from django.utils import timezone
        old_status = self.get_object().status
        instance = serializer.save()
        
        if old_status != Invoice.STATUS_PAID and instance.status == Invoice.STATUS_PAID:
            instance.paid_at = timezone.now()
            instance.save(update_fields=['paid_at'])
            
            # Create the transaction for the institute
            label = f'Platform Subscription Fee - {instance.month.strftime("%B %Y")}'
            if instance.reference_note:
                label += f' (Ref: {instance.reference_note})'
                
            InstituteTransaction.objects.create(
                institute=instance.institute,
                month=instance.month.strftime("%B %Y"), # e.g. "June 2026"
                transaction_type='expense',
                category='platform_fee',
                label=label,
                amount=instance.amount,
                date=timezone.now().date()
            )

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
        year_str = self.request.query_params.get('year', 'all')
        month_str = self.request.query_params.get('month', 'all')
        tx_type = self.request.query_params.get('type')
        
        if year_str != 'all':
            try:
                y = int(year_str)
                qs = qs.filter(date__year=y)
                if month_str != 'all':
                    m = int(month_str)
                    qs = qs.filter(date__month=m)
            except ValueError:
                pass
            
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        from django.db.models import Sum
        income = queryset.filter(transaction_type='income').aggregate(t=Sum('amount'))['t'] or 0
        expense = queryset.filter(transaction_type='expense').aggregate(t=Sum('amount'))['t'] or 0

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['stats'] = {
                'total_income': float(income),
                'total_expense': float(expense)
            }
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'stats': {
                'total_income': float(income),
                'total_expense': float(expense)
            }
        })
