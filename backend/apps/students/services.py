def get_student_stats(institute, academic_year):
    """Active / passout / inactive counts for one academic year — the single
    source of truth both the Students page and the Dashboard read from, so
    the two screens can never show different numbers for the same thing.

    - active: has a StudentBatchEnrollment for this exact year.
    - passout: was enrolled last year, not this year (actually left).
    - inactive: never enrolled in any year at all.
    """
    from .models import Student, StudentBatchEnrollment

    enrolled_ids = set(StudentBatchEnrollment.objects.filter(
        student__institute=institute, academic_year=academic_year,
        status__in=['active', 'archived'],
    ).values_list('student_id', flat=True))
    prior_year_ids = set(StudentBatchEnrollment.objects.filter(
        student__institute=institute, academic_year=academic_year - 1,
        status__in=['active', 'archived'],
    ).exclude(student_id__in=enrolled_ids).values_list('student_id', flat=True))
    ever_enrolled_ids = set(StudentBatchEnrollment.objects.filter(
        student__institute=institute,
    ).values_list('student_id', flat=True))
    never_enrolled_ids = set(
        Student.objects.filter(institute=institute).values_list('id', flat=True)
    ) - ever_enrolled_ids

    active = len(enrolled_ids)
    passout = len(prior_year_ids)
    inactive = len(never_enrolled_ids)
    return {
        'active': active,
        'passout': passout,
        'inactive': inactive,
        'total': active + passout + inactive,
    }
