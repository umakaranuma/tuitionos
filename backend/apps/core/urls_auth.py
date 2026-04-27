from django.urls import path
from .views_auth import LoginView, RequestPasswordResetView, ConfirmPasswordResetView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('password-reset/', RequestPasswordResetView.as_view(), name='auth-password-reset'),
    path('password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='auth-password-reset-confirm'),
]
