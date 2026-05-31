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
        
        # 1. Students with an enrollment in the requested academic year
        enrolled_this_year = list(StudentBatchEnrollment.objects.filter(
            academic_year=academic_year
        ).values_list('student_id', flat=True))
        
        # 2. Legacy students (who have NO enrollments at all)
        enrolled_any_year = list(StudentBatchEnrollment.objects.values_list('student_id', flat=True))
        legacy_qs = qs.exclude(id__in=enrolled_any_year)
        
        # We only want legacy students whose batch name matches a batch in the CURRENT academic year.
        valid_batch_names = Batch.objects.filter(
            institute=self.request.institute,
            academic_year=academic_year
        ).values_list('name', flat=True)
        legacy_qs = legacy_qs.filter(batch__in=valid_batch_names)
        
        legacy_ids = list(legacy_qs.values_list('id', flat=True))
        
        # Combine both valid lists
        valid_student_ids = set(enrolled_this_year + legacy_ids)
        qs = qs.filter(id__in=valid_student_ids)
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
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
