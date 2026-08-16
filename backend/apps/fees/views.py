from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly
from .models import FeePayment
from .serializers import FeePaymentSerializer
from django.utils import timezone


class FeePaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, InstituteOnly]
    serializer_class = FeePaymentSerializer

    def get_queryset(self):
        qs = FeePayment.objects.filter(
            student__institute=self.request.institute
        ).select_related('student', 'batch')
        batch = self.request.query_params.get('batch')
        month = self.request.query_params.get('month')
        fee_status = self.request.query_params.get('status')
        if batch:
            qs = qs.filter(batch_id=batch)
        if month:
            qs = qs.filter(month=month)
        if fee_status:
            qs = qs.filter(status=fee_status)
        return qs

    def _actor_name(self, request):
        return request.user.get_full_name() or request.user.username

    def perform_destroy(self, instance):
        from apps.billing.services import sync_fee_income
        from apps.core.models import log_activity
        student_name, month = instance.student.name, instance.month
        # Delete first, then recompute the month's total from what's left —
        # the aggregate sync sums straight from the DB, so it must run after
        # this row is actually gone or it'd still be counted.
        instance.delete()
        sync_fee_income(instance)
        log_activity(
            self.request.institute, self.request.user, 'fee_deleted',
            f"{self._actor_name(self.request)} deleted a fee record for {student_name} ({month})",
        )

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        from apps.billing.services import sync_fee_income
        from apps.core.models import log_activity
        fee = self.get_object()
        fee.status = 'paid'
        fee.paid_at = timezone.now()
        fee.collected_by = request.user.get_full_name() or request.user.username
        fee.save()
        sync_fee_income(fee)
        log_activity(
            request.institute, request.user, 'fee_marked_paid',
            f"{self._actor_name(request)} collected LKR {fee.amount} fee from {fee.student.name} ({fee.month})",
        )
        return Response(FeePaymentSerializer(fee).data)

    @action(detail=True, methods=['post'])
    def mark_unpaid(self, request, pk=None):
        """Reverse a paid record — toggling a row back to pending. Useful when a
        payment was recorded by mistake or refunded later."""
        from apps.billing.services import sync_fee_income
        fee = self.get_object()
        fee.status = 'pending'
        fee.paid_at = None
        fee.collected_by = ''
        fee.save()
        sync_fee_income(fee)
        return Response(FeePaymentSerializer(fee).data)

    @action(detail=False, methods=['patch'], url_path='upsert')
    def upsert_fee(self, request):
        """Create or update a fee row keyed by student+batch+month. Used by the
        student single view's fees tab when staff want to set a custom amount
        or backfill an entry for a month that wasn't auto-generated."""
        from apps.academics.models import Batch
        student_id = request.data.get('student')
        batch_id = request.data.get('batch')
        month = request.data.get('month')
        amount = request.data.get('amount')
        status_in = request.data.get('status')
        if not all([student_id, batch_id, month]):
            return Response({'error': 'student, batch, month are required'}, status=400)
        try:
            batch = Batch.objects.get(id=batch_id, institute=request.institute)
        except Batch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        from apps.billing.services import sync_fee_income
        defaults = {'amount': amount if amount not in (None, '') else batch.monthly_fee, 'status': 'pending'}
        fee, created = FeePayment.objects.get_or_create(
            student_id=student_id, batch=batch, month=month, defaults=defaults,
        )
        if not created:
            if amount not in (None, ''):
                fee.amount = amount
            if status_in:
                fee.status = status_in
                if status_in == 'paid' and not fee.paid_at:
                    fee.paid_at = timezone.now()
                    fee.collected_by = request.user.get_full_name() or request.user.username
                elif status_in != 'paid':
                    fee.paid_at = None
                    fee.collected_by = ''
            fee.save()
        sync_fee_income(fee)
        return Response(FeePaymentSerializer(fee).data)

    @action(detail=False, methods=['post'])
    def quick_mark(self, request):
        """One-call upsert + status toggle keyed by student+batch+month. Lets the
        fees screen show a student list (not a fee-record list) and let staff tap
        each row to flip paid ↔ unpaid without first generating fee records.
        Accepts `paid: true|false` to set state explicitly, plus optional
        `amount`/`method`/`reference_no`/`notes` captured from the Record
        Payment modal so a real payment trail (not just a status flag) is kept."""
        from apps.academics.models import Batch
        student_id = request.data.get('student')
        batch_id = request.data.get('batch')
        month = request.data.get('month')  # YYYY-MM-01
        paid = bool(request.data.get('paid'))
        amount = request.data.get('amount')
        if not all([student_id, batch_id, month]):
            return Response({'error': 'student, batch, month are required'}, status=400)
        try:
            batch = Batch.objects.get(id=batch_id, institute=request.institute)
        except Batch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        from apps.billing.services import sync_fee_income
        fee, _ = FeePayment.objects.get_or_create(
            student_id=student_id, batch=batch, month=month,
            defaults={'amount': batch.monthly_fee, 'status': 'pending'},
        )
        if amount not in (None, ''):
            fee.amount = amount
        if paid:
            fee.status = 'paid'
            fee.paid_at = timezone.now()
            fee.collected_by = request.user.get_full_name() or request.user.username
            fee.method = request.data.get('method', fee.method)
            fee.reference_no = request.data.get('reference_no', fee.reference_no)
            fee.notes = request.data.get('notes', fee.notes)
        else:
            fee.status = 'pending'
            fee.paid_at = None
            fee.collected_by = ''
            fee.method = ''
            fee.reference_no = ''
        fee.save()
        sync_fee_income(fee)
        if paid:
            from apps.core.models import log_activity
            log_activity(
                request.institute, request.user, 'fee_marked_paid',
                f"{self._actor_name(request)} collected LKR {fee.amount} fee from {fee.student.name} ({fee.month})",
            )
        return Response(FeePaymentSerializer(fee).data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate fee records for all active students in a batch for a given month."""
        batch_id = request.data.get('batch')
        month = request.data.get('month')  # YYYY-MM-01

        if not batch_id or not month:
            return Response(
                {"error": "batch and month are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.academics.models import Batch
        from apps.students.models import StudentBatchEnrollment
        try:
            batch = Batch.objects.get(id=batch_id, institute=request.institute)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found"}, status=status.HTTP_404_NOT_FOUND)

        enrollments = StudentBatchEnrollment.objects.filter(
            batch=batch, status='active',
        ).select_related('student')

        created = []
        for enrollment in enrollments:
            if enrollment.student.is_free:
                continue
            fee, was_created = FeePayment.objects.get_or_create(
                student=enrollment.student,
                batch=batch,
                month=month,
                defaults={'amount': batch.monthly_fee, 'status': 'pending'},
            )
            if was_created:
                created.append(fee)

        return Response({
            "message": f"Generated {len(created)} fee records",
            "data": FeePaymentSerializer(created, many=True).data,
        })
