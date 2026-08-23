from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
User = get_user_model()
from django.core.mail import send_mail
from django.conf import settings
from apps.core.permissions import AdminOnly
from .models import Institute, InstituteUser, PlatformSettings
from .serializers import InstituteSerializer, PlatformSettingsSerializer

class PlatformSettingsViewSet(viewsets.ModelViewSet):
    queryset = PlatformSettings.objects.all()
    serializer_class = PlatformSettingsSerializer
    permission_classes = [IsAuthenticated, AdminOnly]

class InstituteViewSet(viewsets.ModelViewSet):
    """Fynux-admin-only management of institutes (list/create/activate/edit
    any institute). An institute's own admin edits their own name/logo via
    the separate, narrower UpdateInstituteProfileView instead — that path
    can never touch plan/status, this one can, so it stays admin-gated."""
    queryset = Institute.objects.all()
    serializer_class = InstituteSerializer
    permission_classes = [IsAuthenticated, AdminOnly]

    def get_queryset(self):
        from django.db.models import Count, Q
        return Institute.objects.annotate(
            student_count=Count('students', filter=Q(students__is_active=True))
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        name = data.get("name")
        subdomain = data.get("subdomain", "")
        owner_name = data.get("adminName", data.get("owner_name", ""))
        owner_email = data.get("email", data.get("owner_email", ""))
        owner_mobile = data.get("mobile", data.get("owner_mobile", ""))
        plan = data.get("plan", "institute")

        if not all([name, owner_name, owner_email]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        # Subdomain is an internal implementation detail (hidden from the
        # add-institute UI), so a collision here is never something the
        # caller can fix by resubmitting — auto-uniquify instead of erroring.
        # Previously this fallback only ran when the frontend sent no
        # subdomain at all, but it always sends one (auto-generated
        # client-side), so any collision hard-rejected the request even for
        # two genuinely different institute names that happened to slugify
        # the same way.
        if not subdomain:
            import re
            subdomain = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
        subdomain = subdomain[:30]

        if Institute.objects.filter(subdomain=subdomain).exists():
            import uuid
            subdomain = f"{subdomain[:25]}-{str(uuid.uuid4())[:4]}"

        if User.objects.filter(email=owner_email).exists():
            return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # Create Institute (always pending initially)
        institute = Institute.objects.create(
            name=name,
            subdomain=subdomain,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_mobile=owner_mobile,
            plan=plan,
            status=Institute.STATUS_PENDING
        )

        # Create un-usable password User
        user = User.objects.create(
            username=owner_email,
            email=owner_email,
            first_name=owner_name.split()[0],
            last_name=" ".join(owner_name.split()[1:]) if len(owner_name.split()) > 1 else ""
        )
        user.set_unusable_password()
        user.save()

        # Link User to Institute
        InstituteUser.objects.create(
            user=user,
            institute=institute,
            role='admin'
        )

        # Optionally create an initial invoice for the current month
        from django.utils import timezone
        from apps.billing.models import Invoice
        from apps.institutes.models import PlatformSettings
        import datetime

        settings_obj = PlatformSettings.objects.first()
        if not settings_obj:
            settings_obj = PlatformSettings.objects.create()

        if plan == 'solo': amount = settings_obj.monthly_fee_solo
        elif plan == 'institute': amount = settings_obj.monthly_fee_institute
        elif plan == 'institute_pro': amount = settings_obj.monthly_fee_institute_pro
        else: amount = 3000

        Invoice.objects.create(
            institute=institute,
            amount=amount,
            month=timezone.now().date().replace(day=1),
            status=Invoice.STATUS_PENDING,
            due_date=timezone.now().date() + datetime.timedelta(days=7)
        )

        serializer = self.get_serializer(institute)
        return Response({
            "message": "Institute created successfully (Pending Payment).",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    from rest_framework.decorators import action

    @action(detail=True, methods=['post'], permission_classes=[])
    def activate(self, request, pk=None):
        institute = self.get_object()
        if institute.status == Institute.STATUS_ACTIVE:
            return Response({"error": "Already active"}, status=status.HTTP_400_BAD_REQUEST)
        
        institute.status = Institute.STATUS_ACTIVE
        institute.save()

        # Get owner user
        admin_user = institute.users.filter(role='admin').first()
        if not admin_user:
            return Response({"error": "No admin user found"}, status=status.HTTP_400_BAD_REQUEST)

        user = admin_user.user

        # Generate Password Reset Link
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        reset_url = f"{settings.INSTITUTE_APP_URL}/reset-password?uid={uid}&token={token}"

        # Send Welcome Email
        send_mail(
            subject=f"Welcome to TuitionOS - {institute.name}",
            message=f"Hi {institute.owner_name},\n\nYour TuitionOS institute portal has been activated!\n\nTo get started, please set your password and log in by clicking the secure link below:\n\n{reset_url}\n\nWelcome aboard!\n- The TuitionOS Team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[institute.owner_email],
            fail_silently=False,
        )

        return Response({
            "message": "Institute activated and welcome email sent.",
            "status": "active"
        })

