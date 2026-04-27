from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from .models import Institute, InstituteUser

class CreateInstituteView(APIView):
    permission_classes = [] # Allow Fynux Admin in a real scenario, open for now

    def post(self, request):
        data = request.data
        name = data.get("name")
        subdomain = data.get("subdomain")
        owner_name = data.get("adminName")
        owner_email = data.get("email")
        owner_mobile = data.get("mobile", "")
        plan = data.get("plan", "basic")

        if not all([name, subdomain, owner_name, owner_email]):
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

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

        return Response({
            "message": "Institute created successfully and welcome email sent.",
            "institute_id": institute.id,
            "reset_link_debug": reset_url # For debugging only
        }, status=status.HTTP_201_CREATED)
