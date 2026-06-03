from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

from .models import User
from .serializers import LoginSerializer, UserSerializer


class LoginView(APIView):
    """
    Email-only login.

    POST /api/auth/login/  { "email": "eng@company.com" }

    - 400 if the email is malformed.
    - 401 if no User with that email exists.
    - 200 with a 7-day JWT access token + user payload otherwise.

    Bumps `last_seen` on every successful login.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # 400 on malformed email
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account exists for that email."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user.last_seen = timezone.now()
        user.save(update_fields=["last_seen"])

        token = AccessToken.for_user(user)
        return Response(
            {
                "token": str(token),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
