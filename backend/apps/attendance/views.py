from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.views import InstituteBaseViewSet
from .models import Attendance
from .serializers import AttendanceSerializer


class AttendanceViewSet(InstituteBaseViewSet):
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = Attendance.objects.filter(student__institute=self.request.institute)
        if self.request.query_params.get('batch'):
            qs = qs.filter(batch_id=self.request.query_params['batch'])
        if self.request.query_params.get('date'):
            qs = qs.filter(date=self.request.query_params['date'])
        if self.request.query_params.get('student'):
            qs = qs.filter(student_id=self.request.query_params['student'])
        return qs.select_related('student').order_by('-date', 'student__name')

    @action(detail=False, methods=['post'])
    def mark(self, request):
        """Bulk mark attendance for a batch."""
        batch_id = request.data.get('batch')
        date_val = request.data.get('date')
        records = request.data.get('records', [])

        created = 0
        for rec in records:
            obj, was_created = Attendance.objects.update_or_create(
                student_id=rec['student'], batch_id=batch_id, date=date_val,
                defaults={
                    'is_present': rec['is_present'],
                    'subject_id': request.data.get('subject'),
                }
            )
            if was_created:
                created += 1

        return Response({'message': f'{len(records)} records processed, {created} created'})
