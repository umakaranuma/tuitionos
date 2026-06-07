import datetime
from calendar import monthrange

from django.core.paginator import Paginator
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import AdminOnly, InstituteOnly
from apps.institutes.models import Institute, PlatformSettings
from .models import Invoice, InstituteTransaction
from .serializers import InvoiceSerializer, InstituteTransactionSerializer


def _plan_amount(institute, settings_obj):
    if institute.plan == Institute.PLAN_SOLO:
        return settings_obj.monthly_fee_solo
    if institute.plan == Institute.PLAN_INSTITUTE_PRO:
        return settings_obj.monthly_fee_institute_pro
    return settings_obj.monthly_fee_institute


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

    def _resolve_payment_status(self, invoice_status, billing_month):
        if invoice_status == Invoice.STATUS_PAID:
            return Invoice.STATUS_PAID
        today = timezone.now().date()
        if billing_month < today.replace(day=1):
            return Invoice.STATUS_OVERDUE
        return Invoice.STATUS_PENDING

    def _billing_month_end(self, year, month):
        last_day = datetime.date(year, month, monthrange(year, month)[1])
        return timezone.make_aware(
            datetime.datetime.combine(last_day, datetime.time(23, 59, 59)),
            timezone.get_current_timezone(),
        )

    def _institutes_for_billing_month(self, year, month):
        billing_month = datetime.date(year, month, 1)
        today = timezone.now().date()
        current_month_start = today.replace(day=1)

        if billing_month >= current_month_start:
            return Institute.objects.all().order_by('name')

        return Institute.objects.filter(
            created_at__lte=self._billing_month_end(year, month),
        ).order_by('name')

    def _build_monthly_rows(self, year, month):
        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()

        billing_month = datetime.date(year, month, 1)
        institutes = self._institutes_for_billing_month(year, month)

        invoices = {
            inv.institute_id: inv
            for inv in Invoice.objects.filter(month=billing_month).select_related('institute')
        }

        rows = []
        for institute in institutes:
            invoice = invoices.get(institute.id)
            amount = invoice.amount if invoice else _plan_amount(institute, settings_obj)
            raw_status = invoice.status if invoice else Invoice.STATUS_PENDING
            rows.append({
                'institute': institute.id,
                'institute_name': institute.name,
                'plan': institute.plan,
                'registered_at': institute.created_at.date().isoformat(),
                'invoice_id': invoice.id if invoice else None,
                'amount': str(amount),
                'month': billing_month.isoformat(),
                'status': self._resolve_payment_status(raw_status, billing_month),
                'paid_at': invoice.paid_at.isoformat() if invoice and invoice.paid_at else None,
                'reference_note': invoice.reference_note if invoice else None,
                'has_invoice': invoice is not None,
            })
        return rows

    def _apply_status_change(self, invoice, new_status, reference_note=None, old_status=None):
        if old_status is None:
            old_status = invoice.status
        update_fields = ['status']

        if reference_note is not None:
            invoice.reference_note = reference_note or None
            update_fields.append('reference_note')

        invoice.status = new_status
        invoice.save(update_fields=update_fields)

        if old_status != Invoice.STATUS_PAID and new_status == Invoice.STATUS_PAID:
            invoice.paid_at = timezone.now()
            invoice.save(update_fields=['paid_at'])
            self._create_platform_fee_transaction(invoice)
        elif old_status == Invoice.STATUS_PAID and new_status != Invoice.STATUS_PAID:
            invoice.paid_at = None
            invoice.save(update_fields=['paid_at'])
            self._remove_platform_fee_transaction(invoice)

        return invoice

    def _build_yearly_rows(self, year):
        rows = []
        for month in range(1, 13):
            rows.extend(self._build_monthly_rows(year, month))
        return rows

    def _institute_applicable_for_month(self, institute, year, month):
        billing_month = datetime.date(year, month, 1)
        today = timezone.now().date()
        if billing_month >= today.replace(day=1):
            return True
        return institute.created_at <= self._billing_month_end(year, month)

    def _build_institute_month_row(self, institute, year, month, settings_obj):
        if not self._institute_applicable_for_month(institute, year, month):
            return None

        billing_month = datetime.date(year, month, 1)
        invoice = Invoice.objects.filter(institute=institute, month=billing_month).first()
        amount = invoice.amount if invoice else _plan_amount(institute, settings_obj)
        raw_status = invoice.status if invoice else Invoice.STATUS_PENDING

        return {
            'institute': institute.id,
            'institute_name': institute.name,
            'plan': institute.plan,
            'registered_at': institute.created_at.date().isoformat(),
            'invoice_id': invoice.id if invoice else None,
            'amount': str(amount),
            'month': billing_month.isoformat(),
            'status': self._resolve_payment_status(raw_status, billing_month),
            'paid_at': invoice.paid_at.isoformat() if invoice and invoice.paid_at else None,
            'reference_note': invoice.reference_note if invoice else None,
            'due_date': invoice.due_date.isoformat() if invoice else (billing_month + datetime.timedelta(days=7)).isoformat(),
            'has_invoice': invoice is not None,
        }

    def _build_institute_billing_rows(self, institute, year, month=None):
        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()

        months = [month] if month else list(range(1, 13))
        rows = []
        for m in months:
            row = self._build_institute_month_row(institute, year, m, settings_obj)
            if row:
                rows.append(row)
        return rows

    @action(detail=False, methods=['get'], url_path='institute_billing')
    def institute_billing(self, request):
        institute_id = request.query_params.get('institute')
        year_str = request.query_params.get('year')
        month_str = request.query_params.get('month')
        view_mode = request.query_params.get('view', 'monthly')

        if not institute_id or not year_str:
            return Response({'error': 'institute and year are required'}, status=400)

        try:
            institute = Institute.objects.get(pk=int(institute_id))
            year = int(year_str)
        except (ValueError, Institute.DoesNotExist):
            return Response({'error': 'Invalid institute or year'}, status=400)

        if view_mode == 'yearly':
            rows = self._build_institute_billing_rows(institute, year)
            period_label = str(year)
            period_month = None
        else:
            try:
                month = int(month_str)
            except (TypeError, ValueError):
                return Response({'error': 'month is required for monthly view'}, status=400)
            rows = self._build_institute_billing_rows(institute, year, month)
            period_label = billing_month_label(year, month)
            period_month = month

        total_expected = sum(float(row['amount']) for row in rows)
        collected = sum(float(row['amount']) for row in rows if row['status'] == Invoice.STATUS_PAID)
        outstanding = total_expected - collected
        paid_count = sum(1 for row in rows if row['status'] == Invoice.STATUS_PAID)
        pending_count = len(rows) - paid_count

        return Response({
            'results': rows,
            'stats': {
                'total_expected': total_expected,
                'collected': collected,
                'outstanding': outstanding,
                'paid_count': paid_count,
                'pending_count': pending_count,
                'month_count': len(rows),
            },
            'period': {
                'year': year,
                'month': period_month,
                'label': period_label,
                'view': view_mode,
            },
        })

    @action(detail=False, methods=['get'], url_path='monthly_overview')
    def monthly_overview(self, request):
        year_str = request.query_params.get('year', 'all')
        month_str = request.query_params.get('month', 'all')

        if not year_str or year_str == 'all':
            return Response({'error': 'year is required'}, status=400)

        try:
            year = int(year_str)
        except ValueError:
            return Response({'error': 'Invalid year'}, status=400)

        if month_str == 'all':
            rows = self._build_yearly_rows(year)
            period_label = str(year)
            period_month = None
        else:
            try:
                month = int(month_str)
            except ValueError:
                return Response({'error': 'Invalid month'}, status=400)
            rows = self._build_monthly_rows(year, month)
            period_label = billing_month_label(year, month)
            period_month = month

        total_expected = sum(float(row['amount']) for row in rows)
        collected = sum(float(row['amount']) for row in rows if row['status'] == Invoice.STATUS_PAID)
        outstanding = total_expected - collected
        paid_count = sum(1 for row in rows if row['status'] == Invoice.STATUS_PAID)
        pending_count = len(rows) - paid_count
        institute_count = len({row['institute'] for row in rows})

        page_size = int(request.query_params.get('limit', 25))
        page_num = int(request.query_params.get('page', 1))
        paginator = Paginator(rows, page_size)
        page_obj = paginator.get_page(page_num)

        return Response({
            'total_count': paginator.count,
            'current_page': page_obj.number,
            'per_page': page_size,
            'total_pages': paginator.num_pages,
            'results': list(page_obj),
            'stats': {
                'total_expected': total_expected,
                'collected': collected,
                'outstanding': outstanding,
                'paid_count': paid_count,
                'pending_count': pending_count,
                'institute_count': institute_count,
            },
            'period': {
                'year': year,
                'month': period_month,
                'label': period_label,
            },
        })

    @action(detail=False, methods=['post'], url_path='ensure_status')
    def ensure_status(self, request):
        institute_id = request.data.get('institute')
        year = request.data.get('year')
        month = request.data.get('month')
        new_status = request.data.get('status')
        reference_note = request.data.get('reference_note', '')

        if not all([institute_id, year, month, new_status]):
            return Response({'error': 'institute, year, month, and status are required'}, status=400)

        if new_status not in [Invoice.STATUS_PENDING, Invoice.STATUS_PAID, Invoice.STATUS_OVERDUE]:
            return Response({'error': 'Invalid status'}, status=400)

        try:
            year = int(year)
            month = int(month)
            institute = Institute.objects.get(pk=institute_id)
        except (ValueError, Institute.DoesNotExist):
            return Response({'error': 'Invalid institute, year, or month'}, status=400)

        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()

        billing_month = datetime.date(year, month, 1)
        due_date = billing_month + datetime.timedelta(days=7)

        invoice, _ = Invoice.objects.get_or_create(
            institute=institute,
            month=billing_month,
            defaults={
                'amount': _plan_amount(institute, settings_obj),
                'status': Invoice.STATUS_PENDING,
                'due_date': due_date,
            },
        )

        stored_status = Invoice.STATUS_PENDING if new_status == Invoice.STATUS_OVERDUE else new_status
        invoice = self._apply_status_change(invoice, stored_status, reference_note)
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

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

    def _platform_fee_label(self, instance):
        label = f'Platform Subscription Fee - {instance.month.strftime("%B %Y")}'
        if instance.reference_note:
            label += f' (Ref: {instance.reference_note})'
        return label

    def _create_platform_fee_transaction(self, instance):
        from django.utils import timezone

        InstituteTransaction.objects.create(
            institute=instance.institute,
            month=instance.month.strftime("%B %Y"),
            transaction_type='expense',
            category='platform_fee',
            label=self._platform_fee_label(instance),
            amount=instance.amount,
            date=timezone.now().date()
        )

    def _remove_platform_fee_transaction(self, instance):
        month_label = instance.month.strftime("%B %Y")
        prefix = f'Platform Subscription Fee - {month_label}'
        InstituteTransaction.objects.filter(
            institute=instance.institute,
            transaction_type='expense',
            category='platform_fee',
            amount=instance.amount,
            month=month_label,
            label__startswith=prefix,
        ).delete()

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_status = old_instance.status
        validated = serializer.validated_data
        new_status = validated.get('status', old_status)
        reference_note = validated.get('reference_note') if 'reference_note' in validated else None
        instance = serializer.save()
        if new_status != old_status or reference_note is not None:
            self._apply_status_change(instance, new_status, reference_note, old_status=old_status)

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

        return Response({
            "message": f"Successfully generated {generated_count} monthly invoices.",
            "count": generated_count
        })


def billing_month_label(year, month):
    return datetime.date(year, month, 1).strftime('%B %Y')


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
