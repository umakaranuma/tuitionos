from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import InstituteOnly, RequiresWhatsAppFeature
from .models import NotificationLog, Broadcast
from .serializers import NotificationLogSerializer, BroadcastSerializer


class NotificationLogViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated, InstituteOnly, RequiresWhatsAppFeature]

    def get_queryset(self):
        qs = NotificationLog.objects.filter(institute=self.request.institute)
        channel = self.request.query_params.get('channel')
        ntype = self.request.query_params.get('type')
        if channel:
            qs = qs.filter(channel=channel)
        if ntype:
            qs = qs.filter(notification_type=ntype)
        return qs

class BroadcastViewSet(viewsets.ModelViewSet):
    serializer_class = BroadcastSerializer
    permission_classes = [IsAuthenticated, InstituteOnly, RequiresWhatsAppFeature]

    def get_queryset(self):
        return Broadcast.objects.filter(institute=self.request.institute)
