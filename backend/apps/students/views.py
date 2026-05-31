from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly
from .models import Student, StudentBatchEnrollment
from .serializers import StudentSerializer, StudentBatchEnrollmentSerializer


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        qs = Student.objects.filter(institute=self.request.institute)
        
        academic_year = getattr(self.request, 'academic_year', 2026)
        
        from apps.academics.models import Batch
        from .models import StudentBatchEnrollment
        
        batch_id = self.request.query_params.get('batch')
        
        if batch_id:
            batch_obj = Batch.objects.filter(id=batch_id).first()
            if batch_obj:
                academic_year = batch_obj.academic_year
        
        # 1. Students with an enrollment in the requested academic year
        enrolled_qs = StudentBatchEnrollment.objects.filter(academic_year=academic_year)
        if batch_id:
            enrolled_qs = enrolled_qs.filter(batch_id=batch_id)
            
        enrolled_this_year = list(enrolled_qs.values_list('student_id', flat=True))
        
        # 2. Legacy students (who have NO enrollments in this academic year)
        enrolled_this_year_all = list(StudentBatchEnrollment.objects.filter(
            academic_year=academic_year
        ).values_list('student_id', flat=True))
        
        legacy_qs = qs.exclude(id__in=enrolled_this_year_all)
        
        # We only want legacy students whose batch name matches a batch in the CURRENT academic year.
        batches_qs = Batch.objects.filter(institute=self.request.institute, academic_year=academic_year)
        if batch_id:
            batches_qs = batches_qs.filter(id=batch_id)
            
        valid_batch_names = batches_qs.values_list('name', flat=True)
        legacy_qs = legacy_qs.filter(batch__in=valid_batch_names)
        
        legacy_ids = list(legacy_qs.values_list('id', flat=True))
        
        # Combine both valid lists
        valid_student_ids = set(enrolled_this_year + legacy_ids)
        qs = qs.filter(id__in=valid_student_ids)
            
        from django.db.models import OuterRef, Subquery
        current_enrollment_batch = StudentBatchEnrollment.objects.filter(
            student=OuterRef('pk'),
            academic_year=academic_year
        ).order_by('-enrolled_at').values('batch__name')[:1]
        
        qs = qs.annotate(
            enrolled_batch_name=Subquery(current_enrollment_batch)
        )
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
            
        student_status = self.request.query_params.get('student_status')
        if student_status == 'active':
            qs = qs.filter(is_active=True)
        elif student_status == 'inactive':
            qs = qs.filter(is_active=False)
            
        return qs.order_by('name')

    def create(self, request, *args, **kwargs):
        from apps.core.plan_config import check_limit_access
        current_count = Student.objects.filter(institute=request.institute).count()
        if not check_limit_access(request.institute, 'students', current_count):
            return Response(
                {"error": "Student limit reached. Please upgrade your package to add more students."},
                status=status.HTTP_403_FORBIDDEN
            )
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            from apps.academics.models import Batch
            batch_name = request.data.get('batch')
            academic_year = getattr(request, 'academic_year', 2026)
            if batch_name:
                batch = Batch.objects.filter(institute=request.institute, name=batch_name).first()
                if batch:
                    student = Student.objects.get(id=response.data['id'])
                    StudentBatchEnrollment.objects.get_or_create(
                        student=student,
                        batch=batch,
                        academic_year=academic_year,
                        defaults={'status': 'active'}
                    )
        return response

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        student = self.get_object()
        batch_id = request.data.get('batch')
        academic_year = request.data.get('academic_year', 2026)

        enrollment, created = StudentBatchEnrollment.objects.get_or_create(
            student=student, batch_id=batch_id, academic_year=academic_year,
            defaults={'status': 'active'}
        )
        if not created:
            return Response({"error": "Already enrolled"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StudentBatchEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


class StudentBatchEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentBatchEnrollmentSerializer
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        qs = StudentBatchEnrollment.objects.filter(
            student__institute=self.request.institute
        ).select_related('student', 'batch')
        student = self.request.query_params.get('student')
        batch = self.request.query_params.get('batch')
        if student:
            qs = qs.filter(student_id=student)
        if batch:
            qs = qs.filter(batch_id=batch)
        
        qs = qs.filter(academic_year=self.request.academic_year)
        return qs
