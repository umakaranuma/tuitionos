from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly
from .models import BatchPromotionMap
from .serializers import BatchPromotionMapSerializer
from apps.students.models import StudentBatchEnrollment
from django.utils import timezone


class BatchPromotionMapViewSet(viewsets.ModelViewSet):
    serializer_class = BatchPromotionMapSerializer
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        return BatchPromotionMap.objects.filter(
            source_batch__institute=self.request.institute
        ).select_related('source_batch', 'target_batch')

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a promotion: move all active students from source_batch to target_batch."""
        promo_map = self.get_object()
        if promo_map.is_confirmed:
            return Response({"error": "Promotion already executed"}, status=status.HTTP_400_BAD_REQUEST)

        enrollments = StudentBatchEnrollment.objects.filter(
            batch=promo_map.source_batch,
            academic_year=promo_map.academic_year,
            status='active',
        )
        count = 0
        for enrollment in enrollments:
            enrollment.status = 'archived'
            enrollment.promoted_at = timezone.now()
            enrollment.save()

            StudentBatchEnrollment.objects.create(
                student=enrollment.student,
                batch=promo_map.target_batch,
                academic_year=promo_map.academic_year + 1,
                status='active',
            )
            count += 1

        promo_map.is_confirmed = True
        promo_map.save()

        return Response({"message": f"Promoted {count} students successfully"})
