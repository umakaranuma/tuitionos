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
        from apps.promotion.models import BatchPromotionMap
        
        batch_id = self.request.query_params.get('batch')
        
        if batch_id:
            batch_obj = Batch.objects.filter(id=batch_id).first()
            if batch_obj:
                academic_year = batch_obj.academic_year
        
        # 1. Students actively enrolled in this year (including promoted/archived)
        enrolled_qs = StudentBatchEnrollment.objects.filter(
            academic_year=academic_year,
            status__in=['active', 'archived'],
            student__institute=self.request.institute
        )
        if batch_id:
            enrolled_qs = enrolled_qs.filter(batch_id=batch_id)

        enrolled_ids = list(enrolled_qs.values_list('student_id', flat=True))

        search = self.request.query_params.get('search')

        # 2. Everyone else who should still show up for this year's view.
        if search:
            # An explicit search should reach the institute's whole roster —
            # you should be able to find a student by name regardless of
            # which year they were last active in.
            legacy_ids = list(qs.exclude(id__in=enrolled_ids).values_list('id', flat=True))
        elif batch_id:
            # Legacy / unenrolled students who just have a batch_code
            legacy_qs = qs.exclude(id__in=enrolled_ids)
            mapped_codes = list(BatchPromotionMap.objects.filter(
                institute=self.request.institute,
                academic_year=academic_year,
                batch_id=batch_id
            ).values_list('batch_code', flat=True))
            # Also match by the batch's own identifying strings so students
            # whose batch_code is just the batch grade/name still show up even
            # without an explicit promotion mapping.
            if batch_obj:
                extras = {batch_obj.name, batch_obj.label, batch_obj.grade, batch_obj.display_name, str(batch_obj.id)}
                extras.discard('')
                extras.discard(None)
                mapped_codes.extend([c for c in extras if c])
            legacy_ids = list(legacy_qs.filter(batch_code__in=mapped_codes).values_list('id', flat=True))
        # Passed out right at this year's boundary (active last year, not this
        # year) vs. never enrolled anywhere at all — computed unconditionally
        # so both the "All Students" scoping below and the status filter
        # further down use the exact same two buckets instead of drifting.
        prior_year_ids = set(StudentBatchEnrollment.objects.filter(
            academic_year=academic_year - 1,
            status__in=['active', 'archived'],
            student__institute=self.request.institute,
        ).exclude(student_id__in=enrolled_ids).values_list('student_id', flat=True))
        ever_enrolled_ids = set(StudentBatchEnrollment.objects.filter(
            student__institute=self.request.institute,
        ).values_list('student_id', flat=True))
        never_enrolled_ids = set(qs.values_list('id', flat=True)) - ever_enrolled_ids

        if search:
            # An explicit search should reach the institute's whole roster —
            # you should be able to find a student by name regardless of
            # which year they were last active in.
            legacy_ids = list(qs.exclude(id__in=enrolled_ids).values_list('id', flat=True))
        elif batch_id:
            # Legacy / unenrolled students who just have a batch_code
            legacy_qs = qs.exclude(id__in=enrolled_ids)
            mapped_codes = list(BatchPromotionMap.objects.filter(
                institute=self.request.institute,
                academic_year=academic_year,
                batch_id=batch_id
            ).values_list('batch_code', flat=True))
            # Also match by the batch's own identifying strings so students
            # whose batch_code is just the batch grade/name still show up even
            # without an explicit promotion mapping.
            if batch_obj:
                extras = {batch_obj.name, batch_obj.label, batch_obj.grade, batch_obj.display_name, str(batch_obj.id)}
                extras.discard('')
                extras.discard(None)
                mapped_codes.extend([c for c in extras if c])
            legacy_ids = list(legacy_qs.filter(batch_code__in=mapped_codes).values_list('id', flat=True))
        else:
            # No batch filter and no search (the plain "All Students" list) —
            # only show students actually relevant to this year: those who
            # passed out right at this year's boundary, plus students never
            # enrolled anywhere at all. Anyone who left more than a year ago
            # simply isn't part of this year's roster and shouldn't clutter
            # the list forever.
            legacy_ids = list(prior_year_ids | never_enrolled_ids)

        # Combine both valid lists
        valid_student_ids = set(enrolled_ids + legacy_ids)
        qs = qs.filter(id__in=valid_student_ids)

        from django.db.models import OuterRef, Subquery, Case, When, Value, BooleanField, Exists
        current_enrollment_batch = StudentBatchEnrollment.objects.filter(
            student=OuterRef('pk'),
            academic_year=academic_year
        ).order_by('-enrolled_at').values('batch__name')[:1]

        # Distinguishes a student who was once enrolled but isn't this year
        # (passed out / left) from one who's never been enrolled at all
        # (genuinely inactive record) — both currently collapse into the same
        # "not active this year" bucket otherwise.
        past_enrollment = StudentBatchEnrollment.objects.filter(
            student=OuterRef('pk')
        ).exclude(academic_year=academic_year)

        qs = qs.annotate(
            enrolled_batch_name=Subquery(current_enrollment_batch),
            is_active_for_year=Case(
                When(id__in=enrolled_ids, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            ),
            has_past_enrollment=Exists(past_enrollment),
        )

        if search:
            qs = qs.filter(name__icontains=search)

        # active / passout / inactive are now three distinct, mutually
        # exclusive filters (previously "inactive" silently lumped passout
        # students in with never-enrolled ones).
        student_status = self.request.query_params.get('student_status')
        if student_status == 'active':
            qs = qs.filter(id__in=enrolled_ids)
        elif student_status == 'passout':
            qs = qs.filter(id__in=prior_year_ids)
        elif student_status == 'inactive':
            qs = qs.filter(id__in=never_enrolled_ids)

        batch_code_param = self.request.query_params.get('batch_code')
        if batch_code_param:
            qs = qs.filter(batch_code=batch_code_param)

        return qs.order_by('name')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Active / passout / inactive counts for the selected academic year —
        the same numbers the Dashboard shows (both read from the same shared
        helper), so the two screens can never disagree."""
        from .services import get_student_stats
        return Response(get_student_stats(request.institute, getattr(request, 'academic_year', 2026)))

    def create(self, request, *args, **kwargs):
        from apps.core.plan_config import check_limit_access
        # Scoped to the current academic year — a student enrolled (or
        # archived/promoted) in a prior year shouldn't permanently consume
        # this year's quota once they've graduated or moved on.
        academic_year = getattr(request, 'academic_year', 2026)
        current_count = StudentBatchEnrollment.objects.filter(
            student__institute=request.institute,
            academic_year=academic_year,
            status__in=['active', 'archived'],
        ).values('student_id').distinct().count()
        if not check_limit_access(request.institute, 'students', current_count):
            return Response(
                {"error": "Student limit reached for this academic year. Please upgrade your package to add more students."},
                status=status.HTTP_403_FORBIDDEN
            )
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            from apps.promotion.models import BatchPromotionMap
            from apps.academics.models import Batch
            student = Student.objects.get(id=response.data['id'])
            batch_code = student.batch_code
            academic_year = getattr(request, 'academic_year', 2026)
            
            batch_id = request.data.get('batch')
            
            if batch_code and batch_code != 'DEFAULT':
                # Try to find a mapped batch
                mapping = BatchPromotionMap.objects.filter(
                    institute=request.institute,
                    batch_code=batch_code,
                    academic_year=academic_year
                ).first()
                if mapping:
                    batch_id = mapping.batch_id
                    
            batch_obj = None
            if batch_id:
                # The frontend might pass the batch name (e.g. "Grade 7 · Batch A")
                # instead of the integer ID. Same name can legitimately exist in
                # multiple years now that batches carry forward year to year
                # ("Copy from previous year"), so a name-only lookup must also be
                # scoped to this academic year — otherwise it silently resolves
                # to whichever year's batch happens to have the lowest id.
                try:
                    batch_id = int(batch_id)
                    batch_obj = Batch.objects.filter(id=batch_id, institute=request.institute).first()
                except ValueError:
                    batch_obj = Batch.objects.filter(
                        name=batch_id, institute=request.institute, academic_year=academic_year,
                    ).first()
                    batch_id = batch_obj.id if batch_obj else None

            if batch_id:
                # `batch_code` stayed at the model default ('DEFAULT') until now
                # since the create payload only carries `batch`, not
                # `batch_code` — stamp it with the real batch's name (the same
                # convention bulk_enroll uses) so this student's cohort is
                # actually identifiable later (promotion, QR grouping, etc.)
                # instead of sharing the generic 'DEFAULT' bucket with everyone.
                if batch_code == 'DEFAULT' and batch_obj:
                    batch_code = batch_obj.name
                    student.batch_code = batch_code
                    student.save(update_fields=['batch_code'])
                StudentBatchEnrollment.objects.get_or_create(
                    student=student,
                    batch_id=batch_id,
                    academic_year=academic_year,
                    defaults={
                        'status': 'active',
                        'batch_code': batch_code
                    }
                )
        return response

    @action(detail=True, methods=['post'])
    def enroll(self, request, pk=None):
        student = self.get_object()
        batch_id = request.data.get('batch')
        academic_year = request.data.get('academic_year', 2026)
        
        if batch_id:
            try:
                batch_id = int(batch_id)
            except ValueError:
                from apps.academics.models import Batch
                # Scoped to this enrollment's academic year — the same batch
                # name can legitimately exist in multiple years now that
                # batches carry forward year to year ("Copy from previous
                # year"), so an unscoped lookup could silently resolve to the
                # wrong year's batch.
                batch_obj = Batch.objects.filter(
                    name=batch_id, institute=request.institute, academic_year=academic_year,
                ).first()
                if not batch_obj:
                    return Response({"error": "Batch not found"}, status=status.HTTP_400_BAD_REQUEST)
                batch_id = batch_obj.id

        enrollment, created = StudentBatchEnrollment.objects.get_or_create(
            student=student, batch_id=batch_id, academic_year=academic_year,
            defaults={'status': 'active', 'batch_code': student.batch_code}
        )
        if not created:
            return Response({"error": "Already enrolled"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(StudentBatchEnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='bulk_enroll')
    def bulk_enroll(self, request):
        """Enroll many students into a batch in one shot. Used by the attendance
        & fees screens when the user picks a batch that has no active members
        yet. Idempotent: existing active enrollments are left alone."""
        from apps.academics.models import Batch as BatchModel
        student_ids = request.data.get('student_ids') or []
        batch_id = request.data.get('batch')
        academic_year = request.data.get('academic_year') or request.academic_year
        if not student_ids or not batch_id:
            return Response({'error': 'student_ids and batch are required'}, status=400)
        try:
            batch = BatchModel.objects.get(id=batch_id, institute=request.institute)
        except BatchModel.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        created_n = activated_n = 0
        for sid in student_ids:
            try:
                stu = Student.objects.get(id=sid, institute=request.institute)
            except Student.DoesNotExist:
                continue
            enr, was_created = StudentBatchEnrollment.objects.get_or_create(
                student=stu, batch=batch, academic_year=academic_year,
                defaults={'status': 'active', 'batch_code': stu.batch_code or batch.name},
            )
            if was_created:
                created_n += 1
            elif enr.status != 'active':
                # Re-activate a previously archived enrollment.
                enr.status = 'active'
                enr.save(update_fields=['status'])
                activated_n += 1
            # Also stamp the student's batch_code so it shows in legacy queries.
            if stu.batch_code in ('', 'DEFAULT', None):
                stu.batch_code = batch.name
                stu.save(update_fields=['batch_code'])
        return Response({
            'created': created_n,
            'reactivated': activated_n,
            'total': created_n + activated_n,
            'message': f'Enrolled {created_n + activated_n} student(s) in {batch.name}.',
        })


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
