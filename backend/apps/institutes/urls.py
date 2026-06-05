from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InstituteViewSet, PlatformSettingsViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'settings', PlatformSettingsViewSet, basename='platform_settings')
router.register(r'', InstituteViewSet, basename='institute')

urlpatterns = [
    path('', include(router.urls)),
]
