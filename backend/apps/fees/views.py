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

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        fee = self.get_object()
        fee.status = 'paid'
        fee.paid_at = timezone.now()
        fee.collected_by = request.user.get_full_name() or request.user.username
        fee.save()
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
