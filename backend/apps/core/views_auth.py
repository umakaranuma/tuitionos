from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string

class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        
        if not email or not password:
            return Response({"error": "Please provide email and password"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate using email instead of username
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        token, _ = Token.objects.get_or_create(user=user)
        
        # Check if Fynux Admin or Institute User
        is_fynux_admin = user.is_staff or user.is_superuser
        institute_id = None
        
        if not is_fynux_admin:
            try:
                institute_id = user.institute_profile.institute.id
            except Exception:
                pass
                
        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "is_fynux_admin": is_fynux_admin,
                "institute_id": institute_id
            }
        })

class RequestPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            # Generate a secure token (In production, use Django's PasswordResetTokenGenerator)
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            reset_url = f"http://localhost:3001/reset-password?uid={uid}&token={token}"
            
            send_mail(
                subject="Reset Your TuitionOS Password",
                message=f"Hello,\n\nPlease click the link below to reset your password:\n{reset_url}\n\nIf you did not request this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            # We don't reveal if the email exists for security reasons
            pass
            
        return Response({"message": "If the email exists, a reset link has been sent."})

class ConfirmPasswordResetView(APIView):
    permission_classes = []

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        
        if not uidb64 or not token or not new_password:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from django.utils.http import urlsafe_base64_decode
            from django.utils.encoding import force_str
            from django.contrib.auth.tokens import default_token_generator
            
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
            
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                return Response({"message": "Password reset successfully."})
            else:
                return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)
