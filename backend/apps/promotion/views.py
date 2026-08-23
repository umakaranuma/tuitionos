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
            institute=self.request.institute,
            academic_year=self.request.academic_year
        ).select_related('batch')

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        source_batch_id = data.get('source_batch')
        batch_code = data.get('batch_code')
        academic_year = data.get('academic_year')
        
        if source_batch_id and not batch_code:
            from apps.students.models import StudentBatchEnrollment, Student
            from_year = int(academic_year) - 1
            
            source_enrollments = StudentBatchEnrollment.objects.filter(
                student__institute=request.institute,
                batch_id=source_batch_id, 
                academic_year=from_year,
                status='active'
            )
            
            existing_valid = source_enrollments.exclude(batch_code='DEFAULT').first()
            if existing_valid:
                batch_code = existing_valid.batch_code
            else:
                import uuid
                batch_code = f"COHORT-{uuid.uuid4().hex[:8].upper()}"
            
            data['batch_code'] = batch_code
            
            # Unify all active students in this batch to use the determined batch_code
            source_enrollments.exclude(batch_code=batch_code).update(batch_code=batch_code)
            
            Student.objects.filter(
                institute=request.institute,
                enrollments__batch_id=source_batch_id,
                enrollments__academic_year=from_year,
                enrollments__status='active'
            ).exclude(batch_code=batch_code).update(batch_code=batch_code)

        if batch_code and academic_year:
            existing = BatchPromotionMap.objects.filter(
                institute=request.institute,
                batch_code=batch_code, 
                academic_year=academic_year
            ).first()
            
            if existing:
                serializer = self.get_serializer(existing, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                promo_map = serializer.instance
            else:
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                promo_map = serializer.instance
                
            # Instant Execution
            from apps.students.models import Student
            
            from_year = int(academic_year) - 1
            
            enrollments = StudentBatchEnrollment.objects.filter(
                student__institute=request.institute,
                batch_id=source_batch_id,
                academic_year=from_year,
                status='active',
            )
            
            for e in enrollments:
                e.status = 'archived'
                e.promoted_at = timezone.now()
                e.save()
                
                if promo_map.is_passout:
                    Student.objects.filter(id=e.student_id).update(is_active=False)
                    continue
                    
                StudentBatchEnrollment.objects.update_or_create(
                    student_id=e.student_id,
                    batch_id=promo_map.batch_id,
                    academic_year=academic_year,
                    defaults={
                        'batch_code': e.batch_code,
                        'status': 'active'
                    }
                )
            
            # Legacy Sweep
            legacy_students = Student.objects.filter(
                institute=request.institute,
                batch_code=batch_code,
                is_active=True
            ).exclude(id__in=enrollments.values_list('student_id', flat=True))
            
            for student in legacy_students:
                if promo_map.is_passout:
                    student.is_active = False
                    student.save()
                    continue
                    
                StudentBatchEnrollment.objects.update_or_create(
                    student=student,
                    batch_id=promo_map.batch_id,
                    academic_year=academic_year,
                    defaults={
                        'batch_code': student.batch_code,
                        'status': 'active'
                    }
                )
            
            serializer = self.get_serializer(promo_map)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        promo_map = self.get_object()
        from_year = promo_map.academic_year - 1
        
        from apps.students.models import StudentBatchEnrollment, Student
        
        # 1. Delete active enrollments in the target year
        if not promo_map.is_passout:
            StudentBatchEnrollment.objects.filter(
                student__institute=request.institute,
                batch_id=promo_map.batch_id,
                academic_year=promo_map.academic_year,
                batch_code=promo_map.batch_code,
                status='active'
            ).delete()
        else:
            # Reactivate students if they were passout
            Student.objects.filter(
                institute=request.institute,
                batch_code=promo_map.batch_code,
                is_active=False
            ).update(is_active=True)
            
        # 2. Un-archive enrollments in the source year
        StudentBatchEnrollment.objects.filter(
            student__institute=request.institute,
            academic_year=from_year,
            batch_code=promo_map.batch_code,
            status='archived'
        ).update(status='active', promoted_at=None)
        
        return super().destroy(request, *args, **kwargs)
