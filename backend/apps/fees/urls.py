from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeePaymentViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'', FeePaymentViewSet, basename='fee')

urlpatterns = [
    path('', include(router.urls)),
]
