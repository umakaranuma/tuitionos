"""QR-scan endpoints.

A printed student/teacher QR encodes the URL
    https://<subdomain>.tuitionos.lk/q/<qr_token>
or just the token. Hitting these endpoints with the token returns everything
the scanner needs to display: profile + payment summary + attendance summary.

The future mobile app will:
  GET  /api/qr/student/<token>/   → show details
  POST /api/qr/student/<token>/attendance  → mark today's attendance
The same applies for teachers."""
import datetime

from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import InstituteOnly
from apps.academics.models import Teacher, TeacherPayment
from apps.attendance.models import Attendance
from apps.fees.models import FeePayment
from .models import Student


def _student_summary(student: Student, request) -> dict:
    # Last 60 days of attendance for a quick percentage.
    since = timezone.now().date() - datetime.timedelta(days=60)
    att = Attendance.objects.filter(student=student, date__gte=since)
    total = att.count()
    present = att.filter(is_present=True).count()
    rate = round(present / total * 100, 1) if total else 0.0

    # Fee status — pending + overdue + total paid this year.
    year = timezone.now().year
    fees = FeePayment.objects.filter(student=student, month__year=year)
    paid_total = fees.filter(status='paid').aggregate(t=Sum('amount'))['t'] or 0
    pending_total = fees.exclude(status='paid').aggregate(t=Sum('amount'))['t'] or 0
    pending_count = fees.exclude(status='paid').count()

    return {
        'kind': 'student',
        'id': student.id,
        'name': student.name,
        'batch_code': student.batch_code,
        'parent_name': student.parent_name,
        'parent_mobile': student.parent_mobile,
        'is_active': student.is_active,
        'qr_token': student.qr_token,
        'image': request.build_absolute_uri(student.image.url) if student.image else None,
        'attendance': {
            'window_days': 60,
            'present': present, 'total': total, 'rate_pct': rate,
        },
        'fees': {
            'year': year,
            'paid_total': float(paid_total),
            'pending_total': float(pending_total),
            'pending_count': pending_count,
            'status': 'cleared' if pending_count == 0 else 'has_dues',
        },
    }


def _teacher_summary(teacher: Teacher, request) -> dict:
    # Last 6 months of teacher payments + outstanding salary.
    cutoff = timezone.now().date() - datetime.timedelta(days=180)
    payments = TeacherPayment.objects.filter(teacher=teacher, created_at__gte=cutoff)
    paid = payments.filter(status='paid').aggregate(t=Sum('amount'))['t'] or 0
    pending = payments.exclude(status='paid').aggregate(t=Sum('amount'))['t'] or 0
    pending_count = payments.exclude(status='paid').count()

    return {
        'kind': 'teacher',
        'id': teacher.id,
        'name': teacher.name,
        'subject': teacher.subject,
        'mobile': teacher.mobile,
        'email': teacher.email,
        'monthly_salary': float(teacher.monthly_salary),
        'is_active': teacher.is_active,
        'qr_token': teacher.qr_token,
        'image': request.build_absolute_uri(teacher.image.url) if teacher.image else None,
        'payments': {
            'window_days': 180,
            'paid_total': float(paid),
            'pending_total': float(pending),
            'pending_count': pending_count,
            'status': 'cleared' if pending_count == 0 else 'has_dues',
        },
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated, InstituteOnly])
def scan_qr(request, token: str):
    """Resolve any QR token (student or teacher) to its summary. Tenant-scoped."""
    inst = request.institute
    # Try student first, then teacher — tokens are namespaced by uniqueness.
    student = Student.objects.filter(institute=inst, qr_token=token).first()
    if student:
        return Response(_student_summary(student, request))
    teacher = Teacher.objects.filter(institute=inst, qr_token=token).first()
    if teacher:
        return Response(_teacher_summary(teacher, request))
    return Response({'error': 'Unknown QR token'}, status=404)
