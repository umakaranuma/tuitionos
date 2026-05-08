from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InstituteTransactionViewSet

router = DefaultRouter(trailing_slash=False)
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'transactions', InstituteTransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
]
