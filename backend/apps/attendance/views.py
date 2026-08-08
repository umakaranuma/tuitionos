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
        if self.request.query_params.get('subject'):
            qs = qs.filter(subject_id=self.request.query_params['subject'])
        return qs.select_related('student', 'subject').order_by('-date', 'student__name')

    @action(detail=False, methods=['post'])
    def mark(self, request):
        """Bulk mark attendance for a batch, scoped to a specific date + subject
        (subject may be null for a day with no scheduled class, i.e. a general day)."""
        batch_id = request.data.get('batch')
        date_val = request.data.get('date')
        subject_id = request.data.get('subject') or None
        records = request.data.get('records', [])

        created = 0
        for rec in records:
            obj, was_created = Attendance.objects.update_or_create(
                student_id=rec['student'], batch_id=batch_id, subject_id=subject_id, date=date_val,
                defaults={'is_present': rec['is_present']},
            )
            if was_created:
                created += 1

        return Response({'message': f'{len(records)} records processed, {created} created'})

    @action(detail=False, methods=['post'])
    def notify_absentees(self, request):
        """Send a WhatsApp (or SMS fallback) alert to parents of every student
        marked absent for a given batch/date/subject, and log each attempt."""
        from apps.notifications.services.dispatcher import dispatch_notification
        from apps.notifications.models import NotificationLog

        batch_id = request.data.get('batch')
        date_val = request.data.get('date')
        subject_id = request.data.get('subject') or None

        absentees = Attendance.objects.filter(
            student__institute=self.request.institute,
            batch_id=batch_id, subject_id=subject_id, date=date_val, is_present=False,
        ).select_related('student')

        sent, failed = 0, 0
        for record in absentees:
            student = record.student
            message = f"{student.name} was marked absent today ({date_val})."
            channel = 'whatsapp' if student.has_whatsapp else 'sms'
            try:
                dispatch_notification(
                    student,
                    template_name='attendance_absent',
                    components=[{
                        'type': 'body',
                        'parameters': [
                            {'type': 'text', 'text': student.name},
                            {'type': 'text', 'text': str(date_val)},
                        ],
                    }],
                    sms_fallback=message,
                )
                NotificationLog.objects.create(
                    institute=self.request.institute, student=student, channel=channel,
                    notification_type='attendance', recipient_mobile=student.parent_mobile,
                    message_preview=message, is_delivered=True,
                )
                sent += 1
            except Exception as e:
                NotificationLog.objects.create(
                    institute=self.request.institute, student=student, channel=channel,
                    notification_type='attendance', recipient_mobile=student.parent_mobile,
                    message_preview=message, is_delivered=False, error_message=str(e),
                )
                failed += 1

        return Response({'sent': sent, 'failed': failed, 'total': absentees.count()})
