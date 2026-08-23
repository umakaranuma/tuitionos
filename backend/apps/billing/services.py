import datetime
from django.db.models import Sum
from django.utils import timezone


def _as_date(value):
    """Some callers (e.g. quick_mark) assign FeePayment.month as a raw
    'YYYY-MM-DD' string rather than a date instance — get_or_create doesn't
    coerce it on the in-memory object, only on save. Normalize either shape."""
    if isinstance(value, str):
        return datetime.datetime.strptime(value, '%Y-%m-%d').date()
    return value


def _sync_aggregate_row(institute_id, month_label, category, transaction_type, label, total):
    """One running-total row per institute+month+category — every paid fee or
    salary for that month rolls into this single row's amount instead of
    adding a new line, so the ledger shows "Student Fees: LKR 45,000" rather
    than one line per student."""
    from .models import InstituteTransaction

    if total and total > 0:
        InstituteTransaction.objects.update_or_create(
            institute_id=institute_id, category=category, month=month_label, is_auto_synced=True,
            defaults={
                'transaction_type': transaction_type,
                'label': label,
                'amount': total,
                'date': timezone.now().date(),
            },
        )
    else:
        InstituteTransaction.objects.filter(
            institute_id=institute_id, category=category, month=month_label, is_auto_synced=True,
        ).delete()


def sync_fee_income(fee):
    """Recompute the institute's total collected student fees for one
    FeePayment's month and roll it into the single "Student Fees" ledger row
    for that month. Called every time a fee is marked paid/unpaid."""
    from apps.fees.models import FeePayment

    institute_id = fee.student.institute_id
    month_date = _as_date(fee.month)
    total = FeePayment.objects.filter(
        student__institute_id=institute_id, month=month_date, status='paid',
    ).aggregate(t=Sum('amount'))['t'] or 0
    _sync_aggregate_row(
        institute_id, month_date.strftime('%B %Y'),
        category='student_fee', transaction_type='income', label='Student Fees',
        total=total,
    )


def sync_salary_expense(payment):
    """Recompute the institute's total paid teacher salaries for one
    TeacherPayment's month and roll it into the single "Staff Salary" ledger
    row for that month. Called every time a salary payment is created,
    edited, or marked paid."""
    from apps.academics.models import TeacherPayment

    institute_id = payment.institute_id
    total = TeacherPayment.objects.filter(
        institute_id=institute_id, month=payment.month, status='paid',
    ).aggregate(t=Sum('amount'))['t'] or 0
    _sync_aggregate_row(
        institute_id, payment.month,
        category='staff_salary', transaction_type='expense', label='Staff Salary',
        total=total,
    )
