from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly, RequiresPromotionFeature
from .models import BatchPromotionMap
from .serializers import BatchPromotionMapSerializer
from apps.students.models import StudentBatchEnrollment
from django.utils import timezone


class BatchPromotionMapViewSet(viewsets.ModelViewSet):
    serializer_class = BatchPromotionMapSerializer
    permission_classes = [IsAuthenticated, InstituteOnly, RequiresPromotionFeature]

    def get_queryset(self):
        return BatchPromotionMap.objects.filter(
            source_batch__institute=self.request.institute,
            academic_year=self.request.academic_year
        ).select_related('source_batch', 'target_batch')

    def create(self, request, *args, **kwargs):
        source_batch = request.data.get('source_batch')
        academic_year = request.data.get('academic_year')
        
        if source_batch and academic_year:
            existing = BatchPromotionMap.objects.filter(
                source_batch=source_batch, 
                academic_year=academic_year
            ).first()
            
            if existing:
                if existing.is_confirmed:
                    return Response(
                        {"non_field_errors": ["A confirmed promotion mapping already exists for this batch and academic year."]},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                serializer = self.get_serializer(existing, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute a promotion: move all active students from source_batch to target_batch."""
        promo_map = self.get_object()
        if promo_map.is_confirmed:
            return Response({"error": "Promotion already executed"}, status=status.HTTP_400_BAD_REQUEST)

        actions = request.data.get('actions', {})
        enrollments = StudentBatchEnrollment.objects.filter(
            batch=promo_map.source_batch,
            academic_year=promo_map.academic_year,
            status='active',
        )
        count = 0
        for enrollment in enrollments:
            student_id_str = str(enrollment.student_id)
            action = actions.get(student_id_str, 'promote')

            enrollment.status = 'archived'
            enrollment.promoted_at = timezone.now()
            enrollment.save()

            if action == 'promote':
                if promo_map.target_batch is not None:
                    StudentBatchEnrollment.objects.create(
                        student=enrollment.student,
                        batch=promo_map.target_batch,
                        academic_year=promo_map.target_batch.academic_year,
                        status='active',
                    )
            elif action == 'retain':
                next_academic_year = promo_map.target_batch.academic_year if promo_map.target_batch else (promo_map.academic_year + 1)
                StudentBatchEnrollment.objects.create(
                    student=enrollment.student,
                    batch=promo_map.source_batch,
                    academic_year=next_academic_year,
                    status='active',
                )
            elif action == 'remove':
                # The student passes out or is removed, so we do not create a new enrollment
                pass

            count += 1

        promo_map.is_confirmed = True
        promo_map.save()

        return Response({"message": f"Promoted {count} students successfully"})
