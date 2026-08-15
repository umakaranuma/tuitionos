from rest_framework.decorators import action
from rest_framework.response import Response
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

    @action(detail=False, methods=['post'])
    def copy_year(self, request):
        """Seed an entire academic year's timetable from the previous year, in one
        shot, for every batch — not a per-batch manual action. Each batch in
        `to_year` is matched against its same grade+section batch in `to_year - 1`
        (falling back to grade alone if no section matches), and every session
        from the matched source is copied in. Subject/teacher references carry
        over as-is since both are institute-wide records, not scoped to a single
        year's batch. Existing sessions in the target are never touched — a
        session is only added if nothing already occupies that batch's exact
        day/time, so this is safe to call repeatedly and never resurrects a
        session staff deliberately deleted after their first edit."""
        from apps.academics.models import Batch
        to_year = request.data.get('to_year')
        if not to_year:
            return Response({'error': 'to_year is required'}, status=400)
        to_year = int(to_year)
        from_year = to_year - 1

        target_batches = Batch.objects.filter(institute=request.institute, academic_year=to_year)
        source_batches = list(Batch.objects.filter(institute=request.institute, academic_year=from_year))

        total_created = 0
        batches_seeded = 0
        for target in target_batches:
            source = next(
                (b for b in source_batches if b.grade == target.grade and b.section == target.section),
                None,
            ) or next((b for b in source_batches if b.grade == target.grade), None)
            if not source:
                continue

            existing = set(
                TimetableSlot.objects.filter(batch=target)
                .values_list('day_of_week', 'start_time', 'end_time')
            )
            created = []
            for slot in TimetableSlot.objects.filter(batch=source):
                key = (slot.day_of_week, slot.start_time, slot.end_time)
                if key in existing:
                    continue
                created.append(TimetableSlot(
                    batch=target, subject=slot.subject, teacher=slot.teacher,
                    day_of_week=slot.day_of_week, start_time=slot.start_time,
                    end_time=slot.end_time, room=slot.room, notes=slot.notes,
                ))
            if created:
                TimetableSlot.objects.bulk_create(created)
                total_created += len(created)
                batches_seeded += 1

        return Response({
            'message': f'Copied {total_created} session{"s" if total_created != 1 else ""} across {batches_seeded} batch{"es" if batches_seeded != 1 else ""}.',
            'created_count': total_created,
            'batches_seeded': batches_seeded,
        })
