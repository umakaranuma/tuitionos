from apps.core.views import InstituteBaseViewSet
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer


class TimetableSlotViewSet(InstituteBaseViewSet):
    serializer_class = TimetableSlotSerializer

    def get_queryset(self):
        return TimetableSlot.objects.filter(
            batch__institute=self.request.institute
        ).select_related('batch').order_by('day_of_week', 'start_time')

    def perform_create(self, serializer):
        serializer.save()
