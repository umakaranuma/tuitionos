import datetime
from calendar import monthrange
from decimal import Decimal

from django.core.paginator import Paginator
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import AdminOnly, InstituteOnly
from apps.institutes.models import Institute, PlatformSettings
from .models import Invoice, InstituteTransaction, InvoiceActivity, InvoicePayment
from .serializers import (
    InvoiceSerializer,
    InstituteTransactionSerializer,
    InvoiceActivitySerializer,
    InvoicePaymentSerializer,
)


def _actor_name(request):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return user.get_full_name() or getattr(user, 'username', None) or getattr(user, 'email', 'Admin')
    return 'Admin'


def _plan_amount(institute, settings_obj):
    if institute.plan == Institute.PLAN_SOLO:
        return settings_obj.monthly_fee_solo
    if institute.plan == Institute.PLAN_INSTITUTE_PRO:
        return settings_obj.monthly_fee_institute_pro
    return settings_obj.monthly_fee_institute


def _next_billing_month(billing_month):
    if billing_month.month == 12:
        return datetime.date(billing_month.year + 1, 1, 1)
    return datetime.date(billing_month.year, billing_month.month + 1, 1)


def _row_collected_amount(row):
    status = row['status']
    amount = float(row['amount'])
    paid_amount = float(row.get('paid_amount') or 0)
    if status == Invoice.STATUS_PAID:
        return amount
    if status == Invoice.STATUS_PARTIAL:
        return paid_amount
    return 0.0


def _compute_billing_stats(rows):
    total_expected = sum(float(row['amount']) for row in rows)
    collected = sum(_row_collected_amount(row) for row in rows)
    outstanding = total_expected - collected
    paid_count = sum(1 for row in rows if row['status'] == Invoice.STATUS_PAID)
    partial_count = sum(1 for row in rows if row['status'] == Invoice.STATUS_PARTIAL)
    pending_count = len(rows) - paid_count - partial_count
    return {
        'total_expected': total_expected,
        'collected': collected,
        'outstanding': outstanding,
        'paid_count': paid_count,
        'partial_count': partial_count,
        'pending_count': pending_count,
    }


class InvoiceViewSet(viewsets.ModelViewSet):
    """Admin-facing: Platform invoices sent to institutes."""
    queryset = Invoice.objects.select_related('institute').all()
    serializer_class = InvoiceSerializer
    permission_classes = [] # Allow all for now, restrict in production
    parser_classes = [JSONParser, MultiPartParser, FormParser]

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

    def _resolve_payment_status(self, invoice_status, billing_month, paid_amount=0, amount=0):
        paid_amount = float(paid_amount or 0)
        amount = float(amount or 0)
        if amount > 0 and paid_amount >= amount:
            return Invoice.STATUS_PAID
        if paid_amount > 0:
            return Invoice.STATUS_PARTIAL
        if invoice_status == Invoice.STATUS_PAID:
            return Invoice.STATUS_PAID
        today = timezone.now().date()
        if billing_month < today.replace(day=1):
            return Invoice.STATUS_OVERDUE
        return Invoice.STATUS_PENDING

    def _payment_slip_url(self, invoice, request=None):
        if not invoice or not invoice.payment_slip:
            return None
        if request:
            return request.build_absolute_uri(invoice.payment_slip.url)
        return invoice.payment_slip.url

    # ── Proration + due-date policy ──
    # Join month is prorated by remaining days; every later month is the full
    # plan fee. Due date follows the join day each month (clamped to month len).
    def _join_date(self, institute):
        c = institute.created_at
        return c.date() if hasattr(c, 'date') else c

    def _proration_factor(self, institute, billing_month):
        join = self._join_date(institute)
        if join.year == billing_month.year and join.month == billing_month.month and join.day > 1:
            days_in_month = monthrange(billing_month.year, billing_month.month)[1]
            days_active = days_in_month - join.day + 1
            return Decimal(days_active) / Decimal(days_in_month)
        return Decimal('1')

    def _expected_amount(self, institute, billing_month, settings_obj):
        base = Decimal(str(_plan_amount(institute, settings_obj)))
        return (base * self._proration_factor(institute, billing_month)).quantize(Decimal('1'))

    def _anchored_due_date(self, institute, billing_month):
        join = self._join_date(institute)
        days_in_month = monthrange(billing_month.year, billing_month.month)[1]
        day = min(join.day, days_in_month)
        return datetime.date(billing_month.year, billing_month.month, day)

    def _serialize_invoice_row(self, institute, billing_month, invoice, settings_obj, request=None):
        amount = invoice.amount if invoice else self._expected_amount(institute, billing_month, settings_obj)
        paid_amount = invoice.paid_amount if invoice else Decimal('0')
        raw_status = invoice.status if invoice else Invoice.STATUS_PENDING
        status = self._resolve_payment_status(raw_status, billing_month, paid_amount, amount)
        # Prorated indicator for the join month, used by the UI to explain the partial fee.
        is_prorated = self._proration_factor(institute, billing_month) < Decimal('1')
        return {
            'institute': institute.id,
            'institute_name': institute.name,
            'plan': institute.plan,
            'registered_at': institute.created_at.date().isoformat(),
            'invoice_id': invoice.id if invoice else None,
            'amount': str(amount),
            'paid_amount': str(paid_amount),
            'month': billing_month.isoformat(),
            'status': status,
            'paid_at': invoice.paid_at.isoformat() if invoice and invoice.paid_at else None,
            'reference_note': invoice.reference_note if invoice else None,
            'due_date': invoice.due_date.isoformat() if invoice else self._anchored_due_date(institute, billing_month).isoformat(),
            'payment_slip_url': self._payment_slip_url(invoice, request),
            'payment_count': invoice.payments.count() if invoice else 0,
            'is_prorated': is_prorated,
            'has_invoice': invoice is not None,
        }

    def _log_activity(self, invoice, action, detail='', amount=None):
        request = getattr(self, 'request', None)
        InvoiceActivity.objects.create(
            invoice=invoice,
            institute=invoice.institute,
            action=action,
            detail=detail or '',
            actor=_actor_name(request) if request else 'Admin',
            amount_snapshot=amount if amount is not None else invoice.amount,
        )

    def _record_payment_entry(self, invoice, amount, slip=None, reference_note='',
                              is_advance=False, source_month=None):
        """Persist a single transfer/installment so partial settlements keep
        every entry and its own document on record."""
        request = getattr(self, 'request', None)
        return InvoicePayment.objects.create(
            invoice=invoice,
            institute=invoice.institute,
            amount=amount,
            slip=slip if slip else None,
            reference_note=reference_note or '',
            actor=_actor_name(request) if request else 'Admin',
            is_advance=is_advance,
            source_month=source_month,
        )

    def _activate_institute_if_trial(self, invoice):
        """Trial/pending institutes auto-promote to Active when their invoice
        is fully paid. Wired into every payment path via _sync_invoice_status."""
        inst = invoice.institute
        if inst.status in (Institute.STATUS_TRIAL, Institute.STATUS_PENDING):
            old = inst.status
            inst.status = Institute.STATUS_ACTIVE
            inst.save(update_fields=['status'])
            self._log_activity(
                invoice, InvoiceActivity.ACTION_STATUS_CHANGED,
                f'Institute activated ({old} -> active) after paying {invoice.month.strftime("%B %Y")}',
            )

    def _recompute_invoice_from_payments(self, invoice):
        """After editing/removing payment rows, set paid_amount to their sum and
        re-sync the invoice status (pending/partial/paid + ledger entry)."""
        total = invoice.payments.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        invoice.paid_amount = total
        invoice.save(update_fields=['paid_amount'])
        return self._sync_invoice_status(invoice)

    @action(detail=True, methods=['get'], url_path='payments')
    def list_payments(self, request, pk=None):
        invoice = self.get_object()
        payments = InvoicePaymentSerializer(
            invoice.payments.all(), many=True, context={'request': request},
        ).data
        amount = float(invoice.amount)
        paid = float(invoice.paid_amount or 0)
        return Response({
            'results': payments,
            'breakdown': {
                'amount': amount,
                'paid': paid,
                'remaining': max(amount - paid, 0),
                'status': invoice.status,
            },
        })

    @action(detail=True, methods=['patch', 'delete'],
            url_path=r'payments/(?P<payment_id>[^/.]+)',
            parser_classes=[MultiPartParser, FormParser, JSONParser])
    def edit_payment(self, request, pk=None, payment_id=None):
        invoice = self.get_object()
        try:
            payment = invoice.payments.get(pk=int(payment_id))
        except (ValueError, InvoicePayment.DoesNotExist):
            return Response({'error': 'Payment record not found'}, status=404)

        if request.method == 'DELETE':
            removed_amount = payment.amount
            payment.delete()
            invoice = self._recompute_invoice_from_payments(invoice)
            self._log_activity(
                invoice, InvoiceActivity.ACTION_PAYMENT_REMOVED,
                f'Removed payment of LKR {removed_amount}', amount=removed_amount,
            )
            return self._payments_response(invoice, request)

        # PATCH — edit amount / reference / slip of an existing transfer.
        changes = []
        new_amount = request.data.get('amount')
        if new_amount not in (None, ''):
            try:
                amt = Decimal(str(new_amount))
            except (ValueError, ArithmeticError):
                return Response({'error': 'Invalid amount'}, status=400)
            if amt <= 0:
                return Response({'error': 'Amount must be greater than zero'}, status=400)
            if amt != Decimal(str(payment.amount)):
                changes.append(f'amount LKR {payment.amount} -> LKR {amt}')
                payment.amount = amt
        if 'reference_note' in request.data:
            ref = request.data.get('reference_note') or ''
            if ref != (payment.reference_note or ''):
                changes.append('reference updated')
            payment.reference_note = ref
        slip = request.FILES.get('slip')
        if slip:
            payment.slip = slip
            changes.append('document replaced')

        payment.save()
        invoice = self._recompute_invoice_from_payments(invoice)
        if changes:
            self._log_activity(
                invoice, InvoiceActivity.ACTION_PAYMENT_EDITED,
                'Edited payment — ' + '; '.join(changes), amount=payment.amount,
            )
        return self._payments_response(invoice, request)

    def _payments_response(self, invoice, request):
        payments = InvoicePaymentSerializer(
            invoice.payments.all(), many=True, context={'request': request},
        ).data
        amount = float(invoice.amount)
        paid = float(invoice.paid_amount or 0)
        return Response({
            'results': payments,
            'breakdown': {
                'amount': amount,
                'paid': paid,
                'remaining': max(amount - paid, 0),
                'status': invoice.status,
            },
        })

    def _get_or_create_invoice(self, institute, billing_month, settings_obj):
        due_date = self._anchored_due_date(institute, billing_month)
        invoice, created = Invoice.objects.get_or_create(
            institute=institute,
            month=billing_month,
            defaults={
                'amount': self._expected_amount(institute, billing_month, settings_obj),
                'status': Invoice.STATUS_PENDING,
                'due_date': due_date,
            },
        )
        if created:
            self._log_activity(
                invoice, InvoiceActivity.ACTION_CREATED,
                f'Invoice generated for {invoice.month.strftime("%B %Y")}',
            )
        return invoice

    def _sync_invoice_status(self, invoice):
        amount = float(invoice.amount)
        paid_amount = float(invoice.paid_amount or 0)
        old_status = invoice.status

        if paid_amount >= amount and amount > 0:
            invoice.status = Invoice.STATUS_PAID
            if not invoice.paid_at:
                invoice.paid_at = timezone.now()
        elif paid_amount > 0:
            invoice.status = Invoice.STATUS_PARTIAL
            invoice.paid_at = None
        else:
            invoice.status = Invoice.STATUS_PENDING
            invoice.paid_at = None

        invoice.save(update_fields=['status', 'paid_at'])

        if old_status != Invoice.STATUS_PAID and invoice.status == Invoice.STATUS_PAID:
            self._create_platform_fee_transaction(invoice)
            self._activate_institute_if_trial(invoice)
        elif old_status == Invoice.STATUS_PAID and invoice.status != Invoice.STATUS_PAID:
            self._remove_platform_fee_transaction(invoice)

        return invoice

    def _apply_advance_payment(self, institute, from_month, overflow, settings_obj, request=None):
        results = []
        remaining = Decimal(str(overflow))
        billing_month = _next_billing_month(from_month)

        while remaining > 0:
            invoice = self._get_or_create_invoice(institute, billing_month, settings_obj)
            amount_due = Decimal(str(invoice.amount))
            already_paid = Decimal(str(invoice.paid_amount or 0))
            room = amount_due - already_paid
            if room <= 0:
                billing_month = _next_billing_month(billing_month)
                continue

            applied = min(remaining, room)
            invoice.paid_amount = already_paid + applied
            invoice.save(update_fields=['paid_amount'])
            invoice = self._sync_invoice_status(invoice)
            self._record_payment_entry(
                invoice, applied,
                reference_note=f'Advance carried from {from_month.strftime("%B %Y")}',
                is_advance=True, source_month=from_month,
            )
            self._log_activity(
                invoice, InvoiceActivity.ACTION_ADVANCE_APPLIED,
                f'Advance of LKR {applied} applied from {from_month.strftime("%B %Y")}',
                amount=applied,
            )
            remaining -= applied
            results.append(self._serialize_invoice_row(institute, billing_month, invoice, settings_obj, request))
            billing_month = _next_billing_month(billing_month)

        return results

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

        request = getattr(self, 'request', None)
        rows = []
        for institute in institutes:
            invoice = invoices.get(institute.id)
            rows.append(self._serialize_invoice_row(institute, billing_month, invoice, settings_obj, request))
        return rows

    def _apply_status_change(self, invoice, new_status, reference_note=None, old_status=None):
        if old_status is None:
            old_status = invoice.status
        update_fields = ['status']

        if reference_note is not None:
            invoice.reference_note = reference_note or None
            update_fields.append('reference_note')

        if new_status == Invoice.STATUS_PAID:
            invoice.paid_amount = invoice.amount
        elif new_status in (Invoice.STATUS_PENDING, Invoice.STATUS_OVERDUE):
            invoice.paid_amount = Decimal('0')
            update_fields.append('paid_amount')

        invoice.status = new_status
        invoice.save(update_fields=update_fields)

        if old_status != Invoice.STATUS_PAID and new_status == Invoice.STATUS_PAID:
            invoice.paid_at = timezone.now()
            invoice.save(update_fields=['paid_at'])
            self._create_platform_fee_transaction(invoice)
            note = f' (Ref: {reference_note})' if reference_note else ''
            self._log_activity(
                invoice, InvoiceActivity.ACTION_MARKED_PAID,
                f'Marked paid — LKR {invoice.amount}{note}',
            )
            self._activate_institute_if_trial(invoice)
        elif new_status in (Invoice.STATUS_PENDING, Invoice.STATUS_OVERDUE):
            invoice.paid_at = None
            invoice.save(update_fields=['paid_at'])
            if old_status == Invoice.STATUS_PAID:
                self._remove_platform_fee_transaction(invoice)
                self._log_activity(
                    invoice, InvoiceActivity.ACTION_REVERTED_PENDING,
                    'Reverted to pending — platform fee removed from ledger',
                )
            elif old_status != new_status:
                self._log_activity(
                    invoice, InvoiceActivity.ACTION_STATUS_CHANGED,
                    f'Status changed {old_status} → {new_status}',
                )
        elif old_status == Invoice.STATUS_PAID and new_status != Invoice.STATUS_PAID:
            invoice.paid_at = None
            invoice.save(update_fields=['paid_at'])
            self._remove_platform_fee_transaction(invoice)
            self._log_activity(
                invoice, InvoiceActivity.ACTION_STATUS_CHANGED,
                f'Status changed {old_status} → {new_status}',
            )

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
        request = getattr(self, 'request', None)
        return self._serialize_invoice_row(institute, billing_month, invoice, settings_obj, request)

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

    @action(detail=False, methods=['get'], url_path='my_billing')
    def my_billing(self, request):
        """Tenant-scoped billing view — the institute admin sees only their own
        platform invoices. Reuses institute_billing's row builder."""
        inst = getattr(request, 'institute', None)
        if not inst:
            return Response({'error': 'Institute context required'}, status=400)
        year = int(request.query_params.get('year') or timezone.now().year)
        month_str = request.query_params.get('month')
        rows = self._build_institute_billing_rows(inst, year, int(month_str) if month_str else None)
        stats = _compute_billing_stats(rows)
        stats['institute_count'] = 1
        return Response({
            'results': rows,
            'stats': stats,
            'period': {
                'year': year, 'month': int(month_str) if month_str else None,
                'label': billing_month_label(year, int(month_str)) if month_str else str(year),
            },
        })

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

        stats = _compute_billing_stats(rows)
        stats['month_count'] = len(rows)
        stats['institute_count'] = 1

        return Response({
            'results': rows,
            'stats': stats,
            'period': {
                'year': year,
                'month': period_month,
                'label': period_label,
                'view': view_mode,
            },
        })

    def _plan_breakdown(self, rows):
        plan_labels = {
            Institute.PLAN_SOLO: 'Solo',
            Institute.PLAN_INSTITUTE: 'Institute',
            Institute.PLAN_INSTITUTE_PRO: 'Pro',
        }
        buckets = {}
        for row in rows:
            plan = row['plan']
            bucket = buckets.setdefault(plan, {
                'plan': plan,
                'label': plan_labels.get(plan, plan.title()),
                'institutes': 0,
                'expected': 0.0,
                'collected': 0.0,
                'paid_count': 0,
            })
            bucket['institutes'] += 1
            bucket['expected'] += float(row['amount'])
            bucket['collected'] += _row_collected_amount(row)
            if row['status'] == Invoice.STATUS_PAID:
                bucket['paid_count'] += 1
        breakdown = []
        for bucket in buckets.values():
            bucket['outstanding'] = bucket['expected'] - bucket['collected']
            breakdown.append(bucket)
        breakdown.sort(key=lambda b: b['expected'], reverse=True)
        return breakdown

    @action(detail=True, methods=['get'], url_path='detail')
    def detail_view(self, request, pk=None):
        """Single-invoice view: invoice data, payment breakdown, and activity log."""
        invoice = self.get_object()
        amount = float(invoice.amount)
        paid = float(invoice.paid_amount or 0)
        billing_month = invoice.month
        status = self._resolve_payment_status(invoice.status, billing_month, paid, amount)

        activities = InvoiceActivitySerializer(
            invoice.activities.all(), many=True, context={'request': request},
        ).data
        payments = InvoicePaymentSerializer(
            invoice.payments.all(), many=True, context={'request': request},
        ).data
        invoice_data = self.get_serializer(invoice, context={'request': request}).data
        invoice_data['status'] = status

        return Response({
            'invoice': invoice_data,
            'institute': {
                'id': invoice.institute_id,
                'name': invoice.institute.name,
                'plan': invoice.institute.plan,
                'subdomain': invoice.institute.subdomain,
                'status': invoice.institute.status,
            },
            'breakdown': {
                'amount': amount,
                'paid': paid,
                'remaining': max(amount - paid, 0),
                'month': billing_month.isoformat(),
                'month_label': billing_month.strftime('%B %Y'),
                'status': status,
            },
            'payments': payments,
            'activities': activities,
        })

    @action(detail=False, methods=['get'], url_path='revenue_analytics')
    def revenue_analytics(self, request):
        """Year-long revenue trend + plan breakdown for the admin finance dashboards."""
        year_str = request.query_params.get('year', str(timezone.now().year))
        month_str = request.query_params.get('month')
        try:
            year = int(year_str)
        except ValueError:
            return Response({'error': 'Invalid year'}, status=400)

        focus_month = None
        if month_str and month_str != 'all':
            try:
                focus_month = int(month_str)
            except ValueError:
                focus_month = None

        month_short = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        trend = []
        year_expected = year_collected = 0.0
        best = {'label': None, 'collected': 0.0}
        focus_rows = []
        for m in range(1, 13):
            rows = self._build_monthly_rows(year, m)
            stats = _compute_billing_stats(rows)
            trend.append({
                'month': m,
                'label': month_short[m - 1],
                'expected': round(stats['total_expected'], 2),
                'collected': round(stats['collected'], 2),
                'outstanding': round(stats['outstanding'], 2),
                'paid_count': stats['paid_count'],
                'institutes': len(rows),
            })
            year_expected += stats['total_expected']
            year_collected += stats['collected']
            if stats['collected'] > best['collected']:
                best = {'label': billing_month_label(year, m), 'collected': stats['collected']}
            if focus_month and m == focus_month:
                focus_rows = rows

        if focus_month is None:
            focus_month = timezone.now().month if timezone.now().year == year else 12
            focus_rows = self._build_monthly_rows(year, focus_month)

        breakdown = self._plan_breakdown(focus_rows)
        active_count = Institute.objects.filter(status=Institute.STATUS_ACTIVE).count()
        collection_rate = (year_collected / year_expected * 100) if year_expected else 0.0

        return Response({
            'year': year,
            'focus_month': focus_month,
            'focus_label': billing_month_label(year, focus_month),
            'trend': trend,
            'plan_breakdown': breakdown,
            'summary': {
                'year_expected': round(year_expected, 2),
                'year_collected': round(year_collected, 2),
                'year_outstanding': round(year_expected - year_collected, 2),
                'collection_rate': round(collection_rate, 1),
                'avg_mrr': round(year_collected / 12, 2),
                'active_institutes': active_count,
                'best_month': best['label'],
                'best_month_collected': round(best['collected'], 2),
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

        stats = _compute_billing_stats(rows)
        stats['institute_count'] = len({row['institute'] for row in rows})

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
            'stats': stats,
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

        if new_status not in [Invoice.STATUS_PENDING, Invoice.STATUS_PARTIAL, Invoice.STATUS_PAID, Invoice.STATUS_OVERDUE]:
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
        invoice, _ = Invoice.objects.get_or_create(
            institute=institute,
            month=billing_month,
            defaults={
                'amount': self._expected_amount(institute, billing_month, settings_obj),
                'status': Invoice.STATUS_PENDING,
                'due_date': self._anchored_due_date(institute, billing_month),
            },
        )

        stored_status = Invoice.STATUS_PENDING if new_status == Invoice.STATUS_OVERDUE else new_status
        invoice = self._apply_status_change(invoice, stored_status, reference_note)
        serializer = self.get_serializer(invoice, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='record_payment', parser_classes=[MultiPartParser, FormParser])
    def record_payment(self, request):
        institute_id = request.data.get('institute')
        year = request.data.get('year')
        month = request.data.get('month')
        payment_amount = request.data.get('payment_amount')
        invoice_amount = request.data.get('amount')  # optional: set/override the billed amount
        due_date_str = request.data.get('due_date')  # optional: set the balance-due deadline
        reference_note = request.data.get('reference_note', '')
        apply_advance = str(request.data.get('apply_advance', 'true')).lower() in ('1', 'true', 'yes')
        payment_slip = request.FILES.get('payment_slip')

        if not all([institute_id, year, month, payment_amount]):
            return Response({'error': 'institute, year, month, and payment_amount are required'}, status=400)

        try:
            year = int(year)
            month = int(month)
            payment_amount = Decimal(str(payment_amount))
            institute = Institute.objects.get(pk=int(institute_id))
        except (ValueError, Institute.DoesNotExist):
            return Response({'error': 'Invalid payment data'}, status=400)

        if payment_amount <= 0:
            return Response({'error': 'payment_amount must be greater than zero'}, status=400)

        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()

        billing_month = datetime.date(year, month, 1)
        invoice = self._get_or_create_invoice(institute, billing_month, settings_obj)

        # Optionally set the billed amount (e.g. when adding a manual invoice with a
        # custom fee) and the due date for the balance on partial payments.
        invoice_update_fields = []
        if invoice_amount not in (None, ''):
            try:
                new_amount = Decimal(str(invoice_amount))
                if new_amount > 0 and new_amount != Decimal(str(invoice.amount)):
                    old_amount = invoice.amount
                    invoice.amount = new_amount
                    invoice_update_fields.append('amount')
                    self._log_activity(
                        invoice, InvoiceActivity.ACTION_AMOUNT_CHANGED,
                        f'Amount set LKR {old_amount} → LKR {new_amount}',
                        amount=new_amount,
                    )
            except (ValueError, ArithmeticError):
                return Response({'error': 'Invalid amount'}, status=400)
        if due_date_str:
            try:
                invoice.due_date = datetime.date.fromisoformat(due_date_str)
                invoice_update_fields.append('due_date')
            except ValueError:
                return Response({'error': 'Invalid due_date (expected YYYY-MM-DD)'}, status=400)
        if invoice_update_fields:
            invoice.save(update_fields=invoice_update_fields)

        amount_due = Decimal(str(invoice.amount))
        already_paid = Decimal(str(invoice.paid_amount or 0))
        remaining_due = max(amount_due - already_paid, Decimal('0'))
        if remaining_due > 0:
            applied_here = min(payment_amount, remaining_due)
            overflow = payment_amount - applied_here
        else:
            applied_here = Decimal('0')
            overflow = payment_amount

        if applied_here > 0:
            invoice.paid_amount = already_paid + applied_here
            if reference_note:
                invoice.reference_note = reference_note
            if payment_slip:
                invoice.payment_slip = payment_slip
            invoice.save(update_fields=['paid_amount', 'reference_note', 'payment_slip'])
            invoice = self._sync_invoice_status(invoice)
            # Persist this transfer as its own record (keeps each partial entry + doc).
            if payment_slip:
                try:
                    payment_slip.seek(0)  # rewind: file was already read for invoice.payment_slip
                except (AttributeError, ValueError):
                    pass
            self._record_payment_entry(
                invoice, applied_here, slip=payment_slip, reference_note=reference_note,
            )
            note = f' (Ref: {reference_note})' if reference_note else ''
            self._log_activity(
                invoice, InvoiceActivity.ACTION_PAYMENT_RECORDED,
                f'Recorded payment of LKR {applied_here}{note}',
                amount=applied_here,
            )
            if payment_slip:
                self._log_activity(
                    invoice, InvoiceActivity.ACTION_SLIP_UPLOADED,
                    f'Payment slip uploaded ({payment_slip.name})',
                )
        elif payment_slip or reference_note:
            if reference_note:
                invoice.reference_note = reference_note
            if payment_slip:
                invoice.payment_slip = payment_slip
            invoice.save(update_fields=['reference_note', 'payment_slip'])
            if payment_slip:
                self._log_activity(
                    invoice, InvoiceActivity.ACTION_SLIP_UPLOADED,
                    f'Payment slip uploaded ({payment_slip.name})',
                )

        advance_rows = []
        if overflow > 0 and apply_advance:
            advance_rows = self._apply_advance_payment(
                institute, billing_month, overflow, settings_obj, request
            )
        elif overflow > 0:
            return Response({
                'error': f'Payment exceeds amount due by LKR {overflow}. Enable apply_advance or adjust the amount.',
            }, status=400)

        current_row = self._serialize_invoice_row(institute, billing_month, invoice, settings_obj, request)
        serializer = self.get_serializer(invoice, context={'request': request})
        return Response({
            'invoice': serializer.data,
            'current': current_row,
            'advance_applied': advance_rows,
            'overflow': str(overflow),
        })

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
        old_amount = old_instance.amount
        validated = serializer.validated_data
        new_status = validated.get('status', old_status)
        reference_note = validated.get('reference_note') if 'reference_note' in validated else None
        instance = serializer.save()
        if 'amount' in validated and validated['amount'] != old_amount:
            self._log_activity(
                instance, InvoiceActivity.ACTION_AMOUNT_CHANGED,
                f'Amount changed LKR {old_amount} → LKR {instance.amount}',
            )
        if new_status != old_status or reference_note is not None:
            self._apply_status_change(instance, new_status, reference_note, old_status=old_status)

    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()
            
        current_date = timezone.now().date()
        first_day_of_month = current_date.replace(day=1)

        active_institutes = Institute.objects.filter(status=Institute.STATUS_ACTIVE)
        generated_count = 0

        for institute in active_institutes:
            # Check if invoice for this month already exists
            if not Invoice.objects.filter(institute=institute, month=first_day_of_month).exists():
                # Prorate the join month; full fee otherwise. Due date follows
                # the join day each month (clamped to the month length).
                amount = self._expected_amount(institute, first_day_of_month, settings_obj)
                due_date = self._anchored_due_date(institute, first_day_of_month)
                invoice = Invoice.objects.create(
                    institute=institute,
                    amount=amount,
                    month=first_day_of_month,
                    status=Invoice.STATUS_PENDING,
                    due_date=due_date
                )
                self._log_activity(
                    invoice, InvoiceActivity.ACTION_CREATED,
                    f'Auto-generated for {first_day_of_month.strftime("%B %Y")}',
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
