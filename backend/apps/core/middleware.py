from django.http import HttpRequest

class TenantMiddleware:
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
            request.institute = self._resolve_institute(subdomain)
        return self.get_response(request)

    @staticmethod
    def _resolve_institute(subdomain: str):
        try:
            from apps.institutes.models import Institute
            return Institute.objects.get(subdomain=subdomain, is_active=True)
        except Exception:
            return None
