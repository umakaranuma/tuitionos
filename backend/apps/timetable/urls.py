from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimetableSlotViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'', TimetableSlotViewSet, basename='timetable')

urlpatterns = [
    path('', include(router.urls)),
]
