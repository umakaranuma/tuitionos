from rest_framework.permissions import BasePermission
from apps.core.plan_config import check_feature_access

class AdminOnly(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'is_admin', False)

class InstituteOnly(BasePermission):
    """Tenant-scoped access. Blocks suspended/deactivated institutes from any
    write/read action via the API — the institute admin will see a clear
    "account suspended" response and the UI can redirect them appropriately."""
    BLOCKED_STATUSES = {'suspended', 'deactivated'}

    def has_permission(self, request, view):
        inst = getattr(request, 'institute', None)
        if inst is None:
            return False
        if getattr(inst, 'status', None) in self.BLOCKED_STATUSES:
            self.message = (
                f"This institute is {inst.status}. Please contact platform support."
            )
            return False
        return True

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
