from django.http import HttpRequest

class TenantMiddleware:
    """
    Resolves the current institute (tenant) for each request.
    
    In production, resolves via subdomain. In development, falls back to
    resolving via the authenticated user's InstituteUser profile so that
    the SPA frontends (which run on localhost) can function correctly.
    """
    ADMIN_SUBDOMAIN = 'admin'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        host = request.get_host().split(':')[0]
        subdomain = host.split('.')[0]

        if subdomain == self.ADMIN_SUBDOMAIN:
            request.is_admin = True
            request.institute = None
        else:
            request.is_admin = False
            # Try subdomain first (production mode)
            institute = self._resolve_institute(subdomain)
            if not institute:
                # Fallback: resolve from the authenticated user's profile (dev mode)
                institute = self._resolve_from_user(request)
            request.institute = institute

            # Also check if user is a superuser (for admin endpoints on localhost)
            if not request.is_admin:
                try:
                    from rest_framework.authentication import TokenAuthentication
                    auth = TokenAuthentication()
                    result = auth.authenticate(request)
                    if result and result[0].is_staff:
                        request.is_admin = True
                except Exception:
                    pass

        return self.get_response(request)

    @staticmethod
    def _resolve_institute(subdomain: str):
        if subdomain in ('localhost', '127', '0'):
            return None
        try:
            from apps.institutes.models import Institute
            return Institute.objects.get(subdomain=subdomain, is_active=True)
        except Exception:
            return None

    @staticmethod
    def _resolve_from_user(request: HttpRequest):
        """Resolve the institute from the user's token/session (development fallback)."""
        try:
            # Let DRF authenticate first if there's a token header
            from rest_framework.authentication import TokenAuthentication
            auth = TokenAuthentication()
            result = auth.authenticate(request)
            if result:
                user, token = result
                return user.institute_profile.institute
        except Exception:
            pass
        # Fallback: try session-based user
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                return request.user.institute_profile.institute
            except Exception:
                pass
        return None
