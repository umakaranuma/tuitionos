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
                promo_map = serializer.instance
            else:
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                promo_map = serializer.instance
                
            # Instant Execution
            from apps.students.models import Student
            
            enrollments = StudentBatchEnrollment.objects.filter(
                batch=promo_map.source_batch,
                status='active',
            )
            enrolled_student_ids = set()
            
            for enrollment in enrollments:
                enrolled_student_ids.add(enrollment.student_id)
                enrollment.status = 'archived'
                enrollment.promoted_at = timezone.now()
                enrollment.save()
                
                if promo_map.target_batch is not None:
                    StudentBatchEnrollment.objects.create(
                        student=enrollment.student,
                        batch=promo_map.target_batch,
                        academic_year=promo_map.academic_year,
                        status='active',
                    )
            
            # Legacy Sweep
            legacy_students = Student.objects.filter(
                institute=request.institute,
                batch=promo_map.source_batch.name,
                is_active=True
            ).exclude(id__in=enrolled_student_ids)
            
            for student in legacy_students:
                if promo_map.target_batch is not None:
                    StudentBatchEnrollment.objects.create(
                        student=student,
                        batch=promo_map.target_batch,
                        academic_year=promo_map.academic_year,
                        status='active',
                    )
                    
            promo_map.is_confirmed = True
            promo_map.save()
            
            serializer = self.get_serializer(promo_map)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        return super().create(request, *args, **kwargs)
