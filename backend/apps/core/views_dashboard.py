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

        from apps.students.models import Student, StudentBatchEnrollment
        from apps.academics.models import Batch
        from apps.fees.models import FeePayment
        from apps.attendance.models import Attendance

        total_students = StudentBatchEnrollment.objects.filter(
            student__institute=institute, 
            academic_year=request.academic_year, 
            status='active'
        ).values('student').distinct().count()
        active_batches = Batch.objects.filter(institute=institute, is_active=True, academic_year=request.academic_year).count()

        # Fee stats for current month
        fees_this_month = FeePayment.objects.filter(
            student__institute=institute,
            month=current_month,
        )
        total_fees = fees_this_month.count()
        paid_fees = fees_this_month.filter(status='paid').count()
        pending_fees = fees_this_month.exclude(status='paid').count()
        outstanding = fees_this_month.exclude(status='paid').aggregate(
            total=Sum('amount')
        )['total'] or 0

        # Attendance for today
        today_attendance = Attendance.objects.filter(
            student__institute=institute,
            date=today,
        )
        present_today = today_attendance.filter(is_present=True).count()
        absent_today = today_attendance.filter(is_present=False).count()

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
        total_revenue = Invoice.objects.filter(status='paid').aggregate(
            total=Sum('amount')
        )['total'] or 0

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
