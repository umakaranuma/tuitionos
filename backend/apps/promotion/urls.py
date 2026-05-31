from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BatchPromotionMapViewSet

router = DefaultRouter()
router.register(r'', BatchPromotionMapViewSet, basename='promotion')

urlpatterns = [
    path('', include(router.urls)),
]
