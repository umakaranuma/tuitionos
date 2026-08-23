from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubjectViewSet, TeacherViewSet, BatchViewSet,
    ExamViewSet, TeacherPaymentViewSet, TeacherAdvanceViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'teacher-payments', TeacherPaymentViewSet, basename='teacher-payment')
router.register(r'teacher-advances', TeacherAdvanceViewSet, basename='teacher-advance')

urlpatterns = [
    path('', include(router.urls)),
]
