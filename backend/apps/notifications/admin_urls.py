"""Admin-portal notification URLs — mounted at /api/admin/notifications/."""
from django.urls import path

from . import admin_views

urlpatterns = [
    path('recent', admin_views.list_recent, name='admin-notif-recent'),
    path('older', admin_views.list_older, name='admin-notif-older'),
    path('unread_count', admin_views.unread_count, name='admin-notif-unread-count'),
    path('mark_all_read', admin_views.mark_all_read, name='admin-notif-mark-all'),
    path('<int:pk>/read', admin_views.mark_read, name='admin-notif-read'),
    path('<int:pk>/dismiss', admin_views.dismiss, name='admin-notif-dismiss'),
]
