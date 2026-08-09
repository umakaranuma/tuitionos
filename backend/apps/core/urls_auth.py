from django.urls import path
from .views_auth import (
    LoginView, LogoutView, MeView, RequestPasswordResetView, ConfirmPasswordResetView,
    ChangePlanView, UpdateInstituteProfileView, InstituteActivityLogView,
)

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('logout', LogoutView.as_view(), name='auth-logout'),
    path('me', MeView.as_view(), name='auth-me'),
    path('me/plan', ChangePlanView.as_view(), name='auth-me-plan'),
    path('me/institute', UpdateInstituteProfileView.as_view(), name='auth-me-institute'),
    path('me/activity-log', InstituteActivityLogView.as_view(), name='auth-me-activity-log'),
    path('reset-password', RequestPasswordResetView.as_view(), name='auth-password-reset'),
    path('reset-password/confirm', ConfirmPasswordResetView.as_view(), name='auth-password-reset-confirm'),
]
