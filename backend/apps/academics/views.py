from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly
from .models import (
    Subject, Teacher, Batch,
    Exam, ExamMark,
    TeacherPayment, TeacherAdvance,
)
from .serializers import (
    SubjectSerializer, TeacherSerializer, BatchSerializer,
    ExamSerializer, ExamMarkSerializer,
    TeacherPaymentSerializer, TeacherAdvanceSerializer,
)


class InstituteBaseViewSet(viewsets.ModelViewSet):
    """Base ViewSet that filters all queries by the authenticated user's institute."""
    permission_classes = [IsAuthenticated, InstituteOnly]

    def get_queryset(self):
        qs = self.queryset.filter(institute=self.request.institute)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class SubjectViewSet(InstituteBaseViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer

    def create(self, request, *args, **kwargs):
        from apps.core.plan_config import check_limit_access
        current_count = Subject.objects.filter(institute=request.institute).count()
        if not check_limit_access(request.institute, 'subjects', current_count):
            return Response(
                {"error": "Subject limit reached. Please upgrade your package to add more subjects."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


class TeacherViewSet(InstituteBaseViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject=subject)
        return qs


class BatchViewSet(InstituteBaseViewSet):
    queryset = Batch.objects.prefetch_related('batch_subjects__subject', 'batch_subjects__teacher').all()
    serializer_class = BatchSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        academic_year = self.request.query_params.get('academic_year')
        if academic_year == 'all':
            return qs
        elif academic_year and academic_year.isdigit():
            return qs.filter(academic_year=academic_year)
        return qs.filter(academic_year=self.request.academic_year)

    def create(self, request, *args, **kwargs):
        from apps.core.plan_config import check_limit_access
        current_count = Batch.objects.filter(institute=request.institute).count()
        if not check_limit_access(request.institute, 'batches', current_count):
            from rest_framework.response import Response
            from rest_framework import status
            return Response(
                {"error": "Batch limit reached. Please upgrade your package to add more batches."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


class ExamViewSet(InstituteBaseViewSet):
    queryset = Exam.objects.select_related('batch').prefetch_related('schedule').all()
    serializer_class = ExamSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(year=self.request.academic_year)

    @action(detail=True, methods=['get', 'post'])
    def marks(self, request, pk=None):
        exam = self.get_object()
        if request.method == 'GET':
            marks = ExamMark.objects.filter(exam=exam).select_related('student')
            serializer = ExamMarkSerializer(marks, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            records = request.data.get('records', [])
            created = []
            for record in records:
                mark, _ = ExamMark.objects.update_or_create(
                    exam=exam,
                    student_id=record['student'],
                    subject=record['subject'],
                    defaults={'marks': record.get('marks'), 'max_marks': record.get('max_marks', exam.max_marks)},
                )
                created.append(mark)
            return Response(ExamMarkSerializer(created, many=True).data)


class TeacherPaymentViewSet(InstituteBaseViewSet):
    queryset = TeacherPayment.objects.select_related('teacher').all()
    serializer_class = TeacherPaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        teacher = self.request.query_params.get('teacher')
        month = self.request.query_params.get('month')
        if teacher:
            qs = qs.filter(teacher_id=teacher)
        if month:
            qs = qs.filter(month=month)
        return qs

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        payment = self.get_object()
        from django.utils import timezone
        payment.status = 'paid'
        payment.paid_date = timezone.now().date()
        payment.method = request.data.get('method', 'Bank transfer')
        payment.reference_no = request.data.get('reference_no', '')
        payment.save()
        return Response(TeacherPaymentSerializer(payment).data)


class TeacherAdvanceViewSet(InstituteBaseViewSet):
    queryset = TeacherAdvance.objects.select_related('teacher').all()
    serializer_class = TeacherAdvanceSerializer
