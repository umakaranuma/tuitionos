from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly
from .models import (
    Subject, Teacher, Batch, BatchSubject, BatchTeacherConfig,
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

    def _resolve_year(self):
        """Same year-resolution the list endpoint uses, exposed so `list()` can
        decide whether a specific year (not the 'all' view) was requested."""
        academic_year = self.request.query_params.get('academic_year')
        if academic_year == 'all':
            return None
        if academic_year and academic_year.isdigit():
            return int(academic_year)
        return int(self.request.academic_year)

    def get_queryset(self):
        qs = super().get_queryset()
        year = self._resolve_year()
        if year is None:
            return qs
        return qs.filter(academic_year=year)

    @action(detail=False, methods=['post'])
    def copy_year(self, request):
        """Clone every batch from the previous year into `to_year` — grade,
        section, fee, colour, subjects and teacher assignments — so staff don't
        recreate the same grades every year (a grade/section batch recurs every
        year; only its enrolled students change, which promotion handles
        separately). Matched per grade+section rather than gated on the whole
        year being empty, so it's safe to click after partial manual setup and
        safe to click more than once — a batch already present this year (same
        grade+section) is simply skipped, never duplicated."""
        from apps.core.plan_config import check_limit_access
        to_year = request.data.get('to_year')
        if not to_year:
            return Response({'error': 'to_year is required'}, status=400)
        to_year = int(to_year)
        from_year = to_year - 1

        existing = set(
            Batch.objects.filter(institute=request.institute, academic_year=to_year)
            .values_list('grade', 'section')
        )
        prev_batches = Batch.objects.filter(
            institute=request.institute, academic_year=from_year,
        ).prefetch_related('batch_subjects', 'teacher_config')

        count = Batch.objects.filter(institute=request.institute).count()
        created_batches = 0
        for src in prev_batches:
            if (src.grade, src.section) in existing:
                continue
            if not check_limit_access(request.institute, 'batches', count):
                break
            new_batch = Batch.objects.create(
                institute=request.institute, grade=src.grade, section=src.section,
                academic_year=to_year, monthly_fee=src.monthly_fee,
                color=src.color, color_light=src.color_light, is_active=True,
            )
            count += 1
            created_batches += 1
            for bs in src.batch_subjects.all():
                BatchSubject.objects.create(batch=new_batch, subject=bs.subject, teacher=bs.teacher)
            if hasattr(src, 'teacher_config'):
                BatchTeacherConfig.objects.create(
                    batch=new_batch, teacher_fee_percent=src.teacher_config.teacher_fee_percent,
                    notes=src.teacher_config.notes,
                )

        return Response({
            'message': f'Copied {created_batches} batch{"es" if created_batches != 1 else ""} from {from_year}.',
            'created_count': created_batches,
        })

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

    def perform_create(self, serializer):
        from apps.billing.services import sync_salary_expense
        payment = serializer.save()
        sync_salary_expense(payment)

    def perform_update(self, serializer):
        from apps.billing.services import sync_salary_expense
        payment = serializer.save()
        sync_salary_expense(payment)

    def perform_destroy(self, instance):
        from apps.billing.services import sync_salary_expense
        # Delete first, then recompute the month's total from what's left —
        # the aggregate sync sums straight from the DB, so it must run after
        # this row is actually gone or it'd still be counted.
        instance.delete()
        sync_salary_expense(instance)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        from apps.billing.services import sync_salary_expense
        payment = self.get_object()
        from django.utils import timezone
        payment.status = 'paid'
        payment.paid_date = timezone.now().date()
        payment.method = request.data.get('method', 'Bank transfer')
        payment.reference_no = request.data.get('reference_no', '')
        payment.save()
        sync_salary_expense(payment)
        return Response(TeacherPaymentSerializer(payment).data)


class TeacherAdvanceViewSet(InstituteBaseViewSet):
    queryset = TeacherAdvance.objects.select_related('teacher').all()
    serializer_class = TeacherAdvanceSerializer
