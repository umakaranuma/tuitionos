from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BatchPromotionMapViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'', BatchPromotionMapViewSet, basename='promotion')

urlpatterns = [
    path('', include(router.urls)),
]
