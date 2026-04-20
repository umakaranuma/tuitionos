from rest_framework.permissions import BasePermission

class AdminOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'is_admin', False)

class InstituteOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'institute', None) is not None
