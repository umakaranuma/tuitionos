from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
User = get_user_model()
from django.core.mail import send_mail
from django.conf import settings
from .models import Institute, InstituteUser
from .serializers import InstituteSerializer

class InstituteViewSet(viewsets.ModelViewSet):
    queryset = Institute.objects.all()
    serializer_class = InstituteSerializer
    permission_classes = [] # Allow Fynux Admin in a real scenario, open for now

    def create(self, request, *args, **kwargs):
        data = request.data
        name = data.get("name")
        subdomain = data.get("subdomain", "")
        owner_name = data.get("adminName", data.get("owner_name", ""))
        owner_email = data.get("email", data.get("owner_email", ""))
        owner_mobile = data.get("mobile", data.get("owner_mobile", ""))
        plan = data.get("plan", "basic")

        if not all([name, owner_name, owner_email]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        # Handle Subdomain creation if omitted from frontend
        if not subdomain:
            import re
            base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
            subdomain = base_slug[:30]
            if Institute.objects.filter(subdomain=subdomain).exists():
                import uuid
                subdomain = f"{subdomain[:25]}-{str(uuid.uuid4())[:4]}"

        if Institute.objects.filter(subdomain=subdomain).exists():
            return Response({"error": "Institute with this subdomain already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=owner_email).exists():
            return Response({"error": "User with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # Create Institute
        institute = Institute.objects.create(
            name=name,
            subdomain=subdomain,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_mobile=owner_mobile,
            plan=plan,
            status=Institute.STATUS_TRIAL if plan == 'trial' else Institute.STATUS_ACTIVE
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

        # Generate Password Reset Link
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        reset_url = f"http://localhost:3001/reset-password?uid={uid}&token={token}"
        
        # Send Welcome Email
        send_mail(
            subject=f"Welcome to TuitionOS - {institute.name}",
            message=f"Hi {owner_name},\n\nYour TuitionOS institute portal has been created!\n\nTo get started, please set your password and log in by clicking the secure link below:\n\n{reset_url}\n\nWelcome aboard!\n- The TuitionOS Team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[owner_email],
            fail_silently=False,
        )

        serializer = self.get_serializer(institute)
        return Response({
            "message": "Institute created successfully and welcome email sent.",
            "data": serializer.data,
            "reset_link_debug": reset_url # For debugging only
        }, status=status.HTTP_201_CREATED)
