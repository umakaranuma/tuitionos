from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model, authenticate
User = get_user_model()
from django.core.mail import send_mail
from django.conf import settings

import pyotp

class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        totp_code = request.data.get("totp_code")
        
        if not email or not password:
            return Response({"error": "Please provide email and password"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if not user:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        is_fynux_admin = user.is_staff or user.is_superuser
        
        # Admin TOTP flow
        if is_fynux_admin:
            if not user.totp_secret:
                user.totp_secret = pyotp.random_base32()
                user.save()
            
            if not totp_code:
                # Need TOTP
                totp = pyotp.TOTP(user.totp_secret)
                uri = totp.provisioning_uri(name=user.email, issuer_name="TuitionOS Admin")
                return Response({
                    "requires_2fa": True,
                    "is_setup": user.is_totp_enabled,
                    "setup_uri": uri if not user.is_totp_enabled else None,
                    "user": {"is_fynux_admin": True}
                })
            else:
                totp = pyotp.TOTP(user.totp_secret)
                if not totp.verify(totp_code):
                    return Response({"error": "Invalid 2FA code"}, status=status.HTTP_400_BAD_REQUEST)
                
                if not user.is_totp_enabled:
                    user.is_totp_enabled = True
                    user.save()
        
        token, _ = Token.objects.get_or_create(user=user)
        
        institute_id = None
        institute_name = None
        role = None
        institute_data = None
        
        if not is_fynux_admin:
            try:
                profile = user.institute_profile
                institute_id = profile.institute.id
                institute_name = profile.institute.name
                role = profile.role
                institute_data = {
                    "id": profile.institute.id,
                    "name": profile.institute.name,
                    "subdomain": profile.institute.subdomain,
                    "plan": profile.institute.plan,
                    "status": profile.institute.status,
                    "logo": request.build_absolute_uri(profile.institute.logo.url) if profile.institute.logo else None,
                }
            except Exception:
                pass

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "avatar": request.build_absolute_uri(user.avatar.url) if user.avatar else None,
                "is_fynux_admin": is_fynux_admin,
                "institute_id": institute_id,
                "institute_name": institute_name,
                "institute": institute_data,
                "role": role,
            }
        })

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({"message": "Logged out successfully."})

class MeView(APIView):
    """Returns the current logged-in user profile with institute info, and
    lets them update their own name/avatar."""
    permission_classes = [IsAuthenticated]

    def _serialize(self, request, user):
        is_fynux_admin = user.is_staff or user.is_superuser
        role = None

        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "avatar": request.build_absolute_uri(user.avatar.url) if user.avatar else None,
            "is_fynux_admin": is_fynux_admin,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "is_totp_enabled": user.is_totp_enabled,
            "role": role,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
            "institute": None,
        }

        if not is_fynux_admin:
            try:
                profile = user.institute_profile
                inst = profile.institute
                data["institute"] = {
                    "id": inst.id,
                    "name": inst.name,
                    "logo": request.build_absolute_uri(inst.logo.url) if inst.logo else None,
                    "subdomain": inst.subdomain,
                    "plan": inst.plan,
                    "status": inst.status,
                }
                data["role"] = profile.role
            except Exception:
                pass

        return data

    def get(self, request):
        return Response(self._serialize(request, request.user))

    def patch(self, request):
        user = request.user
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        avatar = request.data.get("avatar")

        fields = []
        if first_name is not None:
            user.first_name = first_name
            fields.append('first_name')
        if last_name is not None:
            user.last_name = last_name
            fields.append('last_name')
        if avatar is not None:
            user.avatar = avatar
            fields.append('avatar')

        if fields:
            user.save(update_fields=fields)
            try:
                institute = user.institute_profile.institute
                from apps.core.models import log_activity
                log_activity(institute, user, 'profile_updated', f"{user.get_full_name() or user.username} updated their profile")
            except Exception:
                pass

        return Response(self._serialize(request, user))

class ChangePlanView(APIView):
    """Allows an institute admin to change their active plan.

    Downgrades are rejected when the institute is already over the target plan's
    student/batch limits — keeps data integrity and prevents a silent over-limit
    state. The error response includes the offending counts so the UI can
    explain exactly what needs to be reduced first.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        new_plan = request.data.get("plan")

        if not new_plan or new_plan not in ['solo', 'institute', 'institute_pro']:
            return Response({"error": "Invalid plan specified"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = user.institute_profile
        except Exception:
            return Response({"error": "Institute not found"}, status=status.HTTP_404_NOT_FOUND)

        if profile.role != 'admin':
            return Response({"error": "Only admins can change the plan"}, status=status.HTTP_403_FORBIDDEN)

        inst = profile.institute
        if inst.plan == new_plan:
            return Response({"message": "Already on this plan", "plan": new_plan})

        # Validate downgrades against the destination plan's limits.
        from apps.core.plan_config import PLAN_LIMITS
        from apps.students.models import Student, StudentBatchEnrollment
        from apps.academics.models import Batch, Subject

        target_limits = PLAN_LIMITS.get(new_plan, {})
        current_academic_year = getattr(request, 'academic_year', 2026)
        student_count = StudentBatchEnrollment.objects.filter(
            student__institute=inst, academic_year=current_academic_year,
            status__in=['active', 'archived'],
        ).values('student_id').distinct().count()
        batch_count = Batch.objects.filter(institute=inst, is_active=True).count()
        subject_count = Subject.objects.filter(institute=inst).count()
        overflows = []
        max_students = target_limits.get('students', float('inf'))
        max_batches = target_limits.get('batches', float('inf'))
        max_subjects = target_limits.get('subjects', float('inf'))
        if student_count > max_students:
            overflows.append({
                'limit': 'students', 'current': student_count, 'allowed': max_students,
                'message': f'You have {student_count} students enrolled this year but {new_plan} allows {max_students}.',
            })
        if batch_count > max_batches:
            overflows.append({
                'limit': 'batches', 'current': batch_count, 'allowed': max_batches,
                'message': f'You have {batch_count} batches but {new_plan} allows {max_batches}.',
            })
        if subject_count > max_subjects:
            overflows.append({
                'limit': 'subjects', 'current': subject_count, 'allowed': max_subjects,
                'message': f'You have {subject_count} subjects but {new_plan} allows {max_subjects}.',
            })
        if overflows:
            return Response({
                "error": "Downgrade would exceed the target plan's limits. Reduce the counts first.",
                "overflows": overflows,
                "current_plan": inst.plan,
                "target_plan": new_plan,
            }, status=status.HTTP_409_CONFLICT)

        old_plan = inst.plan
        inst.plan = new_plan
        inst.save(update_fields=['plan'])

        from apps.core.models import log_activity
        log_activity(inst, user, 'plan_changed', f"{user.get_full_name() or user.username} changed the plan from {old_plan} to {new_plan}")

        return Response({
            "message": f"Plan changed from {old_plan} to {new_plan}",
            "plan": new_plan,
            "previous_plan": old_plan,
        })

class UpdateInstituteProfileView(APIView):
    """Lets an institute admin edit their own institute's name/logo — kept
    deliberately narrow (no plan/status) and separate from the admin-only
    InstituteViewSet so a self-service edit can never touch billing state."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        try:
            profile = user.institute_profile
        except Exception:
            return Response({"error": "Institute not found"}, status=status.HTTP_404_NOT_FOUND)

        if profile.role != 'admin':
            return Response({"error": "Only admins can edit institute details"}, status=status.HTTP_403_FORBIDDEN)

        inst = profile.institute
        name = request.data.get("name")
        logo = request.data.get("logo")

        fields = []
        changes = []
        if name is not None and name.strip() and name != inst.name:
            changes.append(f'name "{inst.name}" -> "{name}"')
            inst.name = name
            fields.append('name')
        if logo is not None:
            changes.append('logo')
            inst.logo = logo
            fields.append('logo')

        if fields:
            inst.save(update_fields=fields)
            from apps.core.models import log_activity
            log_activity(inst, user, 'institute_updated', f"{user.get_full_name() or user.username} updated institute {', '.join(changes)}")

        return Response({
            "id": inst.id,
            "name": inst.name,
            "logo": request.build_absolute_uri(inst.logo.url) if inst.logo else None,
            "subdomain": inst.subdomain,
            "plan": inst.plan,
            "status": inst.status,
        })

class InstituteActivityLogView(APIView):
    """Audit trail for the current institute — who changed what, when.
    Unpaginated (last 50) by default for the Settings-page teaser; pass
    `?page=` to paginate through full history for the dedicated Activity page."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            institute = user.institute_profile.institute
        except Exception:
            return Response({"error": "Institute not found"}, status=status.HTTP_404_NOT_FOUND)

        from django.db.models import Q
        from apps.core.models import ActivityLog, ACTIVITY_CATEGORIES
        from apps.core.pagination import StandardPagination
        logs = ActivityLog.objects.filter(institute=institute).select_related('user').order_by('-created_at')

        category = request.query_params.get('category')
        if category in ACTIVITY_CATEGORIES:
            logs = logs.filter(action__in=ACTIVITY_CATEGORIES[category])

        search = request.query_params.get('search')
        if search:
            logs = logs.filter(
                Q(description__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__username__icontains=search)
            )

        def serialize(qs):
            return [
                {
                    "id": log.id,
                    "action": log.action,
                    "description": log.description,
                    "user": (log.user.get_full_name() or log.user.username) if log.user else "System",
                    "created_at": log.created_at,
                }
                for log in qs
            ]

        if request.query_params.get('page'):
            paginator = StandardPagination()
            page = paginator.paginate_queryset(logs, request, view=self)
            return paginator.get_paginated_response(serialize(page))

        return Response(serialize(logs[:50]))

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
