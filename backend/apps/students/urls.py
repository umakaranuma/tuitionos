from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, StudentBatchEnrollmentViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'students', StudentViewSet, basename='student')
router.register(r'enrollments', StudentBatchEnrollmentViewSet, basename='enrollment')

urlpatterns = [
    path('', include(router.urls)),
]
