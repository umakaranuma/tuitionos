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

        total_students = Student.objects.filter(institute=institute, is_active=True).count()
        active_batches = Batch.objects.filter(institute=institute, is_active=True).count()

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
        premium_count = Institute.objects.filter(is_active=True, plan='premium').count()
        basic_count = Institute.objects.filter(is_active=True, plan='basic').count()
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

        for field in ['plan', 'status', 'is_active']:
            if field in request.data:
                setattr(inst, field, request.data[field])
        inst.save()
        return Response({"message": "Institute updated successfully"})
