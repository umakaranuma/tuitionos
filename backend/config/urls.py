from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from apps.core.views_dashboard import InstituteDashboardView, AdminDashboardView, AdminInstituteDetailView

urlpatterns = [
    # ── Auth (public / authenticated) ──
    path('api/', include('apps.core.urls_auth')),

    # ── Fynux Admin endpoints ──
    path('api/admin/', include([
        path('dashboard', AdminDashboardView.as_view(), name='admin-dashboard'),
        path('billing/', include('apps.billing.urls')),
        path('settings', include('apps.core.urls_settings')),
        path('notifications/', include('apps.notifications.admin_urls')),
        path('institutes/<int:pk>', AdminInstituteDetailView.as_view(), name='admin-institute-detail'),
        path('institutes/<int:pk>/<str:action>', AdminInstituteDetailView.as_view(), name='admin-institute-action'),
    ])),

    # ── Institute endpoints (tenant-scoped) ──
    path('api/', include([
        path('dashboard', InstituteDashboardView.as_view(), name='institute-dashboard'),
        path('institutes/', include('apps.institutes.urls')),
        path('academics/', include('apps.academics.urls')),
        path('students/', include('apps.students.urls')),
        path('attendance/', include('apps.attendance.urls')),
        path('fees/', include('apps.fees.urls')),
        path('notifications/', include('apps.notifications.urls')),
        path('timetable/', include('apps.timetable.urls')),
        path('promotion/', include('apps.promotion.urls')),
        path('billing/', include('apps.billing.urls')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
