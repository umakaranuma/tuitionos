from django.urls import path
from .views_auth import LoginView, RequestPasswordResetView, ConfirmPasswordResetView

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('reset-password', RequestPasswordResetView.as_view(), name='auth-password-reset'),
    path('reset-password/confirm', ConfirmPasswordResetView.as_view(), name='auth-password-reset-confirm'),
]
