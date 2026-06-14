from apps.core.views import InstituteBaseViewSet
from apps.core.permissions import RequiresTimetableFeature
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer


class TimetableSlotViewSet(InstituteBaseViewSet):
    serializer_class = TimetableSlotSerializer
    permission_classes = InstituteBaseViewSet.permission_classes + [RequiresTimetableFeature]

    def get_queryset(self):
        # Slots are scoped to a Batch, and each Batch carries its own academic_year.
        # Filtering by the request's academic year keeps the timetable aligned with
        # the year switcher — 2026 and 2027 show different slots based on which
        # batches exist that year.
        qs = TimetableSlot.objects.filter(
            batch__institute=self.request.institute,
            batch__academic_year=self.request.academic_year,
        ).select_related('batch', 'subject', 'teacher').order_by('day_of_week', 'start_time')
        teacher = self.request.query_params.get('teacher')
        batch = self.request.query_params.get('batch')
        student = self.request.query_params.get('student')
        if teacher:
            qs = qs.filter(teacher_id=teacher)
        if batch:
            qs = qs.filter(batch_id=batch)
        if student:
            from apps.students.models import StudentBatchEnrollment
            batch_ids = StudentBatchEnrollment.objects.filter(
                student_id=student, status='active',
                academic_year=self.request.academic_year,
            ).values_list('batch_id', flat=True)
            qs = qs.filter(batch_id__in=list(batch_ids))
        return qs

    def perform_create(self, serializer):
        serializer.save()
