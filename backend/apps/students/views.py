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
        enrollment_status = self.request.query_params.get('batch_status', 'active') # Frontend still sends batch_status
        
        enrolled_any_year = StudentBatchEnrollment.objects.values_list('student_id', flat=True)
        
        if enrollment_status == 'all':
            enrolled_this_year = StudentBatchEnrollment.objects.filter(
                academic_year=academic_year
            ).values_list('student_id', flat=True)
        else:
            db_status = 'active' if enrollment_status == 'active' else 'archived'
            enrolled_this_year = StudentBatchEnrollment.objects.filter(
                academic_year=academic_year,
                status=db_status
            ).values_list('student_id', flat=True)
            
        if enrollment_status == 'active' or enrollment_status == 'all':
            # Show actively enrolled students + legacy students (no enrollments)
            qs = (qs.exclude(id__in=enrolled_any_year) | qs.filter(id__in=enrolled_this_year)).distinct()
        else:
            # Passout: Show only students who have an archived enrollment in this year
            qs = qs.filter(id__in=enrolled_this_year).distinct()
            
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
