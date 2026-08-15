from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly, AdminOnly
from django.db.models import Count, Sum, Q
from django.utils import timezone


class InstituteDashboardView(APIView):
    """Dashboard statistics for an institute admin."""
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get(self, request):
        institute = request.institute
        today = timezone.now().date()
        current_month = today.replace(day=1)

        from apps.academics.models import Batch
        from apps.fees.models import FeePayment
        from apps.attendance.models import Attendance

        # There's no user-facing way to toggle a batch's active flag, so it
        # isn't a meaningful filter here — just count every batch that exists
        # for the selected year.
        active_batches = Batch.objects.filter(institute=institute, academic_year=request.academic_year).count()

        # Same helper the Students page's own stats card reads from — so the
        # two screens can never show two different counts. "Total Students"
        # here means every student tied to this year (active + passout +
        # inactive), not just the currently-enrolled subset.
        from apps.students.services import get_student_stats
        student_stats = get_student_stats(institute, request.academic_year)
        total_students = student_stats['total']

        year_str = request.query_params.get('year', str(today.year))
        month_str = request.query_params.get('month', str(today.month))

        from datetime import date
        from apps.students.models import StudentBatchEnrollment

        month_date = None
        if year_str != 'all' and month_str != 'all':
            try:
                month_date = date(int(year_str), int(month_str), 1)
            except ValueError:
                month_date = None

        if month_date:
            # "Fees Due" means every active, non-free student this year who
            # hasn't paid for this specific month — including students who
            # never even got a FeePayment row generated yet (the Fees screen
            # only creates a row once staff act on it, so no row does not
            # mean paid). Counting only existing unpaid rows silently ignored
            # anyone with no row at all, which was most of the real total.
            # Same status set as get_student_stats' "active" bucket (active +
            # archived) — otherwise a student counted in Total Students could
            # silently be excluded here, and the two KPIs would disagree.
            payable_enrollments = list(StudentBatchEnrollment.objects.filter(
                student__institute=institute, academic_year=request.academic_year,
                status__in=['active', 'archived'], student__is_free=False,
            ).select_related('batch').order_by('student_id'))
            student_batch = {}
            for e in payable_enrollments:
                student_batch.setdefault(e.student_id, e.batch)
            payable_student_ids = set(student_batch.keys())

            month_fees = {
                f.student_id: f for f in FeePayment.objects.filter(
                    student__institute=institute, month=month_date, student_id__in=payable_student_ids,
                )
            }
            paid_ids = {sid for sid, f in month_fees.items() if f.status == 'paid'}

            total_fees = len(payable_student_ids)
            paid_fees = len(paid_ids)
            pending_fees = total_fees - paid_fees
            outstanding = 0.0
            for sid in payable_student_ids - paid_ids:
                fee = month_fees.get(sid)
                outstanding += float(fee.amount) if fee else float(student_batch[sid].monthly_fee)
        else:
            # Spanning multiple months/years — there's no single roster to
            # check attendance-style, so report on whatever fee records
            # actually exist in that range.
            fees_qs = FeePayment.objects.filter(student__institute=institute)
            if year_str != 'all':
                try:
                    fees_qs = fees_qs.filter(month__year=int(year_str))
                except ValueError:
                    pass
            total_fees = fees_qs.count()
            paid_fees = fees_qs.filter(status='paid').count()
            pending_fees = fees_qs.exclude(status='paid').count()
            outstanding = fees_qs.exclude(status='paid').aggregate(total=Sum('amount'))['total'] or 0

        # Prefer literally today, but an institute doesn't necessarily take
        # attendance every single day — if nothing's been marked yet today,
        # fall back to the most recent date that actually has records so this
        # doesn't read as a false "0" the moment nobody's marked today's class.
        attendance_date = today
        if not Attendance.objects.filter(student__institute=institute, date=today).exists():
            attendance_date = Attendance.objects.filter(
                student__institute=institute,
            ).order_by('-date').values_list('date', flat=True).first()

        if attendance_date:
            day_attendance = Attendance.objects.filter(student__institute=institute, date=attendance_date)
            present_today = day_attendance.filter(is_present=True).count()
            absent_today = day_attendance.filter(is_present=False).count()
        else:
            present_today = absent_today = 0

        # ── Per-batch attendance, for the last few dates that actually have
        # records — real dates/rates instead of a fabricated Mon/Tue/Wed table.
        batches = Batch.objects.filter(
            institute=institute, academic_year=request.academic_year,
        ).order_by('grade')[:4]
        recent_dates = list(
            Attendance.objects.filter(student__institute=institute)
            .order_by('-date').values_list('date', flat=True).distinct()[:3]
        )
        recent_dates.reverse()  # oldest of the three first, so columns read left-to-right chronologically
        attendance_by_batch = []
        for b in batches:
            batch_att = Attendance.objects.filter(batch=b)
            day_cols = []
            for d in recent_dates:
                day_qs = batch_att.filter(date=d)
                total = day_qs.count()
                present = day_qs.filter(is_present=True).count()
                day_cols.append({
                    'label': d.strftime('%a %d'),
                    'rate': round(present / total * 100) if total else None,
                })
            overall_total = batch_att.count()
            overall_present = batch_att.filter(is_present=True).count()
            attendance_by_batch.append({
                'batch': b.display_name,
                'days': day_cols,
                'overall_rate': round(overall_present / overall_total * 100) if overall_total else None,
            })

        # ── Teacher payroll for the current calendar month ──
        from apps.academics.models import Teacher, TeacherPayment
        month_label = today.strftime('%B %Y')
        active_teachers = Teacher.objects.filter(institute=institute, is_active=True)
        teacher_count = active_teachers.count()
        salary_obligation = active_teachers.aggregate(t=Sum('monthly_salary'))['t'] or 0
        month_payments = TeacherPayment.objects.filter(
            institute=institute, month=month_label, payment_type='salary',
        )
        payroll_paid_count = month_payments.filter(status='paid').values('teacher').distinct().count()
        payroll_paid_amount = month_payments.filter(status='paid').aggregate(t=Sum('amount'))['t'] or 0

        # ── Recent alerts actually sent (attendance/fee notifications) ──
        from apps.notifications.models import NotificationLog
        recent_alerts = [{
            'type': n.notification_type,
            'name': n.student.name if n.student else 'Unknown',
            'sub': n.message_preview[:80],
            'time': n.sent_at.isoformat(),
            'channel': 'WA' if n.channel == 'whatsapp' else 'SMS',
            'delivered': n.is_delivered,
        } for n in NotificationLog.objects.filter(institute=institute).select_related('student').order_by('-sent_at')[:5]]

        return Response({
            'total_students': total_students,
            'active_batches': active_batches,
            'fees': {
                'total': total_fees,
                'paid': paid_fees,
                'pending': pending_fees,
                'outstanding': float(outstanding),
            },
            'attendance': {
                'present_today': present_today,
                'absent_today': absent_today,
                'date': attendance_date.isoformat() if attendance_date else None,
                'is_today': attendance_date == today,
                'by_batch': attendance_by_batch,
            },
            'payroll': {
                'month': month_label,
                'teacher_count': teacher_count,
                'paid_count': payroll_paid_count,
                'paid_amount': float(payroll_paid_amount),
                'total_amount': float(salary_obligation),
            },
            'recent_alerts': recent_alerts,
            'institute': {
                'name': institute.name,
                'plan': institute.plan,
                'status': institute.status,
                'trial_ends_at': institute.trial_ends_at,
                'created_at': institute.created_at,
            },
        })


class AdminDashboardView(APIView):
    """Dashboard statistics for Fynux Admin (super admin)."""
    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request):
        from apps.institutes.models import Institute
        from apps.billing.models import Invoice
        from apps.students.models import Student

        today = timezone.now().date()

        total_institutes = Institute.objects.filter(is_active=True).count()
        premium_count = Institute.objects.filter(is_active=True, plan='institute_pro').count()
        basic_count = Institute.objects.filter(is_active=True, plan='institute').count()
        solo_count = Institute.objects.filter(is_active=True, plan='solo').count()
        trial_count = Institute.objects.filter(is_active=True, status='trial').count()

        # Invoices
        overdue_invoices = Invoice.objects.filter(status='overdue').count()
        pending_invoices = Invoice.objects.filter(status='pending').count()
        year_str = request.query_params.get('year', 'all')
        month_str = request.query_params.get('month', 'all')

        invoice_qs = Invoice.objects.filter(status='paid')
        if year_str != 'all':
            try:
                y = int(year_str)
                invoice_qs = invoice_qs.filter(month__year=y)
                if month_str != 'all':
                    m = int(month_str)
                    invoice_qs = invoice_qs.filter(month__month=m)
            except ValueError:
                pass

        total_revenue = invoice_qs.aggregate(total=Sum('amount'))['total'] or 0
        revenue_premium = invoice_qs.filter(institute__plan='institute_pro').aggregate(total=Sum('amount'))['total'] or 0
        revenue_basic = invoice_qs.filter(institute__plan='institute').aggregate(total=Sum('amount'))['total'] or 0
        revenue_solo = invoice_qs.filter(institute__plan='solo').aggregate(total=Sum('amount'))['total'] or 0

        # Total students across platform
        total_students = Student.objects.filter(is_active=True).count()

        # Trials expiring in next 7 days
        from datetime import timedelta
        trials_expiring = Institute.objects.filter(
            status='trial',
            trial_ends_at__lte=today + timedelta(days=7),
            trial_ends_at__gte=today,
        ).count()

        return Response({
            'total_institutes': total_institutes,
            'premium_count': premium_count,
            'basic_count': basic_count,
            'solo_count': solo_count,
            'trial_count': trial_count,
            'trials_expiring': trials_expiring,
            'overdue_invoices': overdue_invoices,
            'pending_invoices': pending_invoices,
            'total_revenue': float(total_revenue),
            'revenue_premium': float(revenue_premium),
            'revenue_basic': float(revenue_basic),
            'revenue_solo': float(revenue_solo),
            'total_students': total_students,
        })


class AdminInstituteDetailView(APIView):
    """Detailed view of a single institute for Fynux Admin."""
    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request, pk):
        from apps.institutes.models import Institute
        from apps.students.models import Student
        from apps.academics.models import Batch
        from apps.billing.models import Invoice

        try:
            inst = Institute.objects.get(pk=pk)
        except Institute.DoesNotExist:
            return Response({"error": "Institute not found"}, status=404)

        student_count = Student.objects.filter(institute=inst, is_active=True).count()
        batch_count = Batch.objects.filter(institute=inst, is_active=True).count()
        invoices = Invoice.objects.filter(institute=inst).order_by('-month')[:6]

        from django.utils import timezone
        today = timezone.now().date()
        current_month = today.replace(day=1)
        current_invoice = Invoice.objects.filter(institute=inst, month=current_month).first()
        current_month_billing_status = current_invoice.status if current_invoice else "not_generated"

        return Response({
            'id': inst.id,
            'name': inst.name,
            'subdomain': inst.subdomain,
            'owner_name': inst.owner_name,
            'owner_email': inst.owner_email,
            'owner_mobile': inst.owner_mobile,
            'plan': inst.plan,
            'status': inst.status,
            'is_active': inst.is_active,
            'trial_ends_at': inst.trial_ends_at,
            'created_at': inst.created_at,
            'student_count': student_count,
            'batch_count': batch_count,
            'current_month_billing_status': current_month_billing_status,
            'recent_invoices': [{
                'id': inv.id,
                'amount': float(inv.amount),
                'month': inv.month,
                'status': inv.status,
                'due_date': inv.due_date,
            } for inv in invoices],
        })

    def patch(self, request, pk):
        from apps.institutes.models import Institute
        try:
            inst = Institute.objects.get(pk=pk)
        except Institute.DoesNotExist:
            return Response({"error": "Institute not found"}, status=404)

        old_status = inst.status

        for field in ['plan', 'status', 'is_active']:
            if field in request.data:
                setattr(inst, field, request.data[field])
        inst.save()

        if old_status == Institute.STATUS_PENDING and inst.status == Institute.STATUS_ACTIVE:
            # Dispatch welcome email
            admin_user = inst.users.filter(role='admin').first()
            if admin_user:
                user = admin_user.user
                from django.contrib.auth.tokens import default_token_generator
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from django.core.mail import send_mail
                from django.conf import settings
                
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                
                reset_url = f"http://localhost:3001/reset-password?uid={uid}&token={token}"
                
                send_mail(
                    subject=f"Welcome to TuitionOS - {inst.name}",
                    message=f"Hi {inst.owner_name},\n\nYour TuitionOS institute portal has been activated!\n\nTo get started, please set your password and log in by clicking the secure link below:\n\n{reset_url}\n\nWelcome aboard!\n- The TuitionOS Team",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[inst.owner_email],
                    fail_silently=False,
                )

        return Response({"message": "Institute updated successfully"})

    def post(self, request, pk, action=None):
        # We handle activate using post from frontend API if frontend uses post
        from apps.institutes.models import Institute
        if action == "activate":
            try:
                inst = Institute.objects.get(pk=pk)
                if inst.status == Institute.STATUS_ACTIVE:
                    return Response({"error": "Already active"}, status=400)
                
                inst.status = Institute.STATUS_ACTIVE
                inst.is_active = True
                inst.save()
                
                admin_user = inst.users.filter(role='admin').first()
                if admin_user:
                    user = admin_user.user
                    from django.contrib.auth.tokens import default_token_generator
                    from django.utils.http import urlsafe_base64_encode
                    from django.utils.encoding import force_bytes
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    uid = urlsafe_base64_encode(force_bytes(user.pk))
                    token = default_token_generator.make_token(user)
                    
                    reset_url = f"http://localhost:3001/reset-password?uid={uid}&token={token}"
                    
                    send_mail(
                        subject=f"Welcome to TuitionOS - {inst.name}",
                        message=f"Hi {inst.owner_name},\n\nYour TuitionOS institute portal has been activated!\n\nTo get started, please set your password and log in by clicking the secure link below:\n\n{reset_url}\n\nWelcome aboard!\n- The TuitionOS Team",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[inst.owner_email],
                        fail_silently=False,
                    )
                return Response({"message": "Institute activated successfully"})
            except Institute.DoesNotExist:
                return Response({"error": "Institute not found"}, status=404)
        return Response({"error": "Action not supported"}, status=400)
