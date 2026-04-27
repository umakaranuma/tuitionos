from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import CreateInstituteView

router = DefaultRouter()
urlpatterns = router.urls + [
    path('create/', CreateInstituteView.as_view(), name='institute-create'),
]
