from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import AdminOnly
from apps.institutes.models import PlatformSettings


class PlatformSettingsView(APIView):
    permission_classes = [IsAuthenticated, AdminOnly]

    def get(self, request):
        settings, _ = PlatformSettings.objects.get_or_create(pk=1)
        return Response({
            'monthly_fee_basic': float(settings.monthly_fee_basic),
            'monthly_fee_premium': float(settings.monthly_fee_premium),
            'trial_days': settings.trial_days,
            'suspension_grace_days': settings.suspension_grace_days,
        })

    def put(self, request):
        settings, _ = PlatformSettings.objects.get_or_create(pk=1)
        for field in ['monthly_fee_basic', 'monthly_fee_premium', 'trial_days', 'suspension_grace_days']:
            if field in request.data:
                setattr(settings, field, request.data[field])
        settings.save()
        return Response({
            'message': 'Settings updated',
            'monthly_fee_basic': float(settings.monthly_fee_basic),
            'monthly_fee_premium': float(settings.monthly_fee_premium),
            'trial_days': settings.trial_days,
            'suspension_grace_days': settings.suspension_grace_days,
        })


urlpatterns = [
    path('', PlatformSettingsView.as_view(), name='platform-settings'),
]
