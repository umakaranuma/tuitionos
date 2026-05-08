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
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('name')

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
        return qs
