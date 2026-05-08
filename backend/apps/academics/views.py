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
        return self.queryset.filter(institute=self.request.institute)


class SubjectViewSet(InstituteBaseViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


class TeacherViewSet(InstituteBaseViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer


class BatchViewSet(InstituteBaseViewSet):
    queryset = Batch.objects.select_related('subject', 'teacher').all()
    serializer_class = BatchSerializer


class ExamViewSet(InstituteBaseViewSet):
    queryset = Exam.objects.select_related('batch').prefetch_related('schedule').all()
    serializer_class = ExamSerializer

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
