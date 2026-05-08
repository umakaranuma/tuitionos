from django.urls import path
from .views_auth import LoginView, LogoutView, MeView, RequestPasswordResetView, ConfirmPasswordResetView

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('logout', LogoutView.as_view(), name='auth-logout'),
    path('me', MeView.as_view(), name='auth-me'),
    path('reset-password', RequestPasswordResetView.as_view(), name='auth-password-reset'),
    path('reset-password/confirm', ConfirmPasswordResetView.as_view(), name='auth-password-reset-confirm'),
]
