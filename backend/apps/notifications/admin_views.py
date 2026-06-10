"""Admin-portal notification endpoints — the bell + Alerts screen.

Recent (≤14d) is loaded by default; older history is paginated 20 at a time
on demand so the screen stays fast even with thousands of historical alerts.
"""
import datetime

from django.core.paginator import Paginator
from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import AdminOnly
from apps.institutes.models import Institute
from apps.billing.models import Invoice, InvoiceActivity, InvoicePayment
from .models import AdminNotification


RECENT_DAYS = 7  # Today + last week. Anything older goes behind the "Show older" pagination.
OLDER_PAGE_SIZE = 20


# ── Sync helpers ──────────────────────────────────────────────────────────────

def _upsert(kind, severity, title, sub, institute, dedupe_key, payload=None, created_at=None):
    """Idempotent — same dedupe_key won't create duplicates. Pass created_at to
    backdate a historical event (auto_now_add is overridden via update())."""
    obj, created = AdminNotification.objects.get_or_create(
        dedupe_key=dedupe_key,
        defaults={
            'kind': kind, 'severity': severity, 'title': title, 'sub': sub,
            'institute': institute, 'payload': payload or {},
        },
    )
    if created and created_at is not None:
        AdminNotification.objects.filter(pk=obj.pk).update(created_at=created_at)
    return obj


def _backfill_from_activity_log():
    """Reconstruct notifications from the InvoiceActivity audit trail so the
    Alerts screen reflects what actually happened over time — institutes
    joining, invoices generated, payments recorded, marked-paid events, etc.

    Idempotent via dedupe_key: re-running won't duplicate."""
    # Payment-recorded events → success notifications at the activity's timestamp
    for a in InvoiceActivity.objects.filter(
        action__in=[
            InvoiceActivity.ACTION_PAYMENT_RECORDED,
            InvoiceActivity.ACTION_MARKED_PAID,
            InvoiceActivity.ACTION_ADVANCE_APPLIED,
        ],
    ).select_related('invoice', 'institute'):
        inv = a.invoice
        kind = AdminNotification.KIND_PAYMENT_RECEIVED
        amount = a.amount_snapshot or inv.amount
        if a.action == InvoiceActivity.ACTION_ADVANCE_APPLIED:
            title = f'{a.institute.name} — advance applied'
            sub = f'LKR {amount} carried forward · {inv.month:%b %Y}'
        elif a.action == InvoiceActivity.ACTION_MARKED_PAID:
            title = f'{a.institute.name} — {inv.month:%b %Y} marked paid'
            sub = f'LKR {amount} · {a.institute.get_plan_display()}'
        else:
            title = f'{a.institute.name} — payment recorded'
            sub = f'LKR {amount} · {inv.month:%b %Y}'
        _upsert(
            kind=kind, severity='success',
            title=title, sub=sub,
            institute=a.institute,
            dedupe_key=f'activity:{a.id}',
            payload={'invoice_id': inv.id, 'activity_id': a.id, 'action': a.action},
            created_at=a.created_at,
        )

    # Invoice-created events → info notifications
    for a in InvoiceActivity.objects.filter(
        action=InvoiceActivity.ACTION_CREATED,
    ).select_related('invoice', 'institute'):
        inv = a.invoice
        _upsert(
            kind=AdminNotification.KIND_INFO, severity='info',
            title=f'{a.institute.name} — invoice generated for {inv.month:%b %Y}',
            sub=f'LKR {inv.amount} · due {inv.due_date.isoformat()}',
            institute=a.institute,
            dedupe_key=f'activity:{a.id}',
            payload={'invoice_id': inv.id, 'activity_id': a.id},
            created_at=a.created_at,
        )

    # Historical institute joins (older than the recent 3-day window the live
    # sync covers) — so the timeline starts with each institute joining.
    for inst in Institute.objects.all():
        _upsert(
            kind=AdminNotification.KIND_INSTITUTE_JOINED, severity='success',
            title=f'{inst.name} joined the platform',
            sub=f'{inst.get_plan_display()} · {inst.owner_email}',
            institute=inst,
            dedupe_key=f'joined:{inst.id}',
            payload={'institute_id': inst.id},
            created_at=inst.created_at,
        )


def sync_admin_notifications():
    """Generate notifications from current institute/invoice state + replay any
    historical events not yet surfaced.

    Runs every time the bell is opened. Idempotent via dedupe_key — a single
    overdue invoice or trial-expiring institute produces exactly one alert.
    """
    # Replay historical events first so the timeline is populated.
    _backfill_from_activity_log()

    today = timezone.now().date()

    # Overdue invoices (past due_date, not fully paid)
    for inv in Invoice.objects.filter(
        due_date__lt=today,
    ).exclude(status='paid').select_related('institute'):
        key = f'overdue:{inv.id}'
        days = (today - inv.due_date).days
        _upsert(
            kind=AdminNotification.KIND_PAYMENT_OVERDUE, severity='error',
            title=f'{inv.institute.name} — {days} day{"s" if days != 1 else ""} overdue',
            sub=f'LKR {inv.amount} · {inv.institute.get_plan_display()} · {inv.month:%b %Y}',
            institute=inv.institute, dedupe_key=key,
            payload={'invoice_id': inv.id, 'days_overdue': days},
        )

    # Due today
    for inv in Invoice.objects.filter(
        due_date=today,
    ).exclude(status='paid').select_related('institute'):
        key = f'due_today:{inv.id}:{today.isoformat()}'
        _upsert(
            kind=AdminNotification.KIND_PAYMENT_DUE_TODAY, severity='warn',
            title=f'{inv.institute.name} — due today',
            sub=f'LKR {inv.amount} · {inv.institute.get_plan_display()} · {inv.month:%b %Y}',
            institute=inv.institute, dedupe_key=key,
            payload={'invoice_id': inv.id},
        )

    # Trials expiring within 7 days
    soon = today + datetime.timedelta(days=7)
    for inst in Institute.objects.filter(
        status=Institute.STATUS_TRIAL,
        trial_ends_at__isnull=False,
        trial_ends_at__gte=today, trial_ends_at__lte=soon,
    ):
        days = (inst.trial_ends_at - today).days
        key = f'trial_expiring:{inst.id}:{inst.trial_ends_at.isoformat()}'
        _upsert(
            kind=AdminNotification.KIND_TRIAL_EXPIRING, severity='info',
            title=f'{inst.name} — trial ends in {days} day{"s" if days != 1 else ""}',
            sub=f'{inst.get_plan_display()} trial · {inst.owner_email}',
            institute=inst, dedupe_key=key,
            payload={'institute_id': inst.id},
        )

    # Recently joined institutes (last 3 days) — informational welcome alert
    cutoff = timezone.now() - datetime.timedelta(days=3)
    for inst in Institute.objects.filter(created_at__gte=cutoff):
        key = f'joined:{inst.id}'
        _upsert(
            kind=AdminNotification.KIND_INSTITUTE_JOINED, severity='success',
            title=f'{inst.name} joined the platform',
            sub=f'{inst.get_plan_display()} · {inst.owner_email}',
            institute=inst, dedupe_key=key,
            payload={'institute_id': inst.id},
        )


def _serialize(n: AdminNotification) -> dict:
    return {
        'id': n.id,
        'kind': n.kind,
        'severity': n.severity,
        'title': n.title,
        'sub': n.sub,
        'institute_id': n.institute_id,
        'payload': n.payload or {},
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat(),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated, AdminOnly])
def list_recent(request):
    """Last `RECENT_DAYS` of notifications — loaded on initial render."""
    sync_admin_notifications()  # cheap, idempotent
    cutoff = timezone.now() - datetime.timedelta(days=RECENT_DAYS)
    qs = AdminNotification.objects.filter(is_dismissed=False, created_at__gte=cutoff)
    total_older = AdminNotification.objects.filter(is_dismissed=False, created_at__lt=cutoff).count()
    unread = AdminNotification.objects.filter(is_dismissed=False, is_read=False).count()
    return Response({
        'results': [_serialize(n) for n in qs],
        'unread_count': unread,
        'has_older': total_older > 0,
        'older_count': total_older,
        'recent_days': RECENT_DAYS,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, AdminOnly])
def list_older(request):
    """Older history — paginated 20 at a time, newest first.
    Default loads only the older bucket (>14d), so callers don't double-count."""
    page = int(request.query_params.get('page', 1) or 1)
    limit = int(request.query_params.get('limit', OLDER_PAGE_SIZE) or OLDER_PAGE_SIZE)
    cutoff = timezone.now() - datetime.timedelta(days=RECENT_DAYS)
    qs = AdminNotification.objects.filter(is_dismissed=False, created_at__lt=cutoff)
    paginator = Paginator(qs, limit)
    page_obj = paginator.get_page(page)
    return Response({
        'results': [_serialize(n) for n in page_obj.object_list],
        'page': page_obj.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
        'has_next': page_obj.has_next(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, AdminOnly])
def mark_read(request, pk):
    try:
        n = AdminNotification.objects.get(pk=pk)
    except AdminNotification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    if not n.is_read:
        n.is_read = True
        n.read_at = timezone.now()
        n.save(update_fields=['is_read', 'read_at'])
    return Response(_serialize(n))


@api_view(['POST'])
@permission_classes([IsAuthenticated, AdminOnly])
def mark_all_read(request):
    now = timezone.now()
    updated = AdminNotification.objects.filter(is_read=False, is_dismissed=False).update(
        is_read=True, read_at=now,
    )
    return Response({'updated': updated})


@api_view(['POST'])
@permission_classes([IsAuthenticated, AdminOnly])
def dismiss(request, pk):
    try:
        n = AdminNotification.objects.get(pk=pk)
    except AdminNotification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    n.is_dismissed = True
    n.save(update_fields=['is_dismissed'])
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated, AdminOnly])
def unread_count(request):
    sync_admin_notifications()
    n = AdminNotification.objects.filter(is_dismissed=False, is_read=False).count()
    return Response({'unread_count': n})
