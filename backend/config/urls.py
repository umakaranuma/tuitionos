from django.urls import path, include
urlpatterns = [
    path('api/admin/', include([
        path('billing', include('apps.billing.urls')),
        path('settings', include('apps.core.urls_settings')),
    ])),
    path('api/', include([
        path('institutes', include('apps.institutes.urls')),
        path('academics', include('apps.academics.urls')),
        path('students', include('apps.students.urls')),
        path('attendance', include('apps.attendance.urls')),
        path('fees', include('apps.fees.urls')),
        path('notifications', include('apps.notifications.urls')),
        path('timetable', include('apps.timetable.urls')),
        path('promotion', include('apps.promotion.urls')),
    ])),
    path('api/', include('apps.core.urls_auth')),
]
