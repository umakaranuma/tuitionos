from rest_framework.permissions import BasePermission
from apps.core.plan_config import check_feature_access

class AdminOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'is_admin', False)

class InstituteOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'institute', None) is not None

class RequiresTimetableFeature(BasePermission):
    message = "Your current package does not include Timetable management. Please upgrade to Institute Pro."
    def has_permission(self, request, view):
        return check_feature_access(getattr(request, 'institute', None), 'timetable')

class RequiresPromotionFeature(BasePermission):
    message = "Your current package does not include Year-end Promotions. Please upgrade to Institute Pro."
    def has_permission(self, request, view):
        return check_feature_access(getattr(request, 'institute', None), 'promotion')

class RequiresWhatsAppFeature(BasePermission):
    message = "Your current package does not include WhatsApp notifications. Please upgrade to Institute Pro."
    def has_permission(self, request, view):
        return check_feature_access(getattr(request, 'institute', None), 'whatsapp')
