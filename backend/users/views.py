import requests as http_requests
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeveloperProfile
from .serializers import ProfileSerializer
from .utils import get_leaderboard_payload


class LeaderboardView(APIView):
    """Return the top 100 developers ordered by dev_score."""
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        data = get_leaderboard_payload(limit=100, use_cache=True)
        return Response(data)


class GithubLoginView(APIView):
    """
    Exchange a GitHub OAuth code for a DRF token.
    Frontend sends { "code": "<github_oauth_code>" }
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        code = request.data.get("code")
        if not code:
            return Response(
                {"error": "GitHub OAuth code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange code for access token
        token_response = http_requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        if token_response.status_code != 200:
            return Response(
                {"error": "Failed to exchange code with GitHub."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            gh_error = token_data.get(
                "error_description",
                token_data.get("error", "Failed to obtain access token."),
            )
            return Response(
                {"error": f"GitHub OAuth error: {gh_error}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Fetch GitHub user info
        user_response = http_requests.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            timeout=10,
        )

        if user_response.status_code != 200:
            return Response(
                {"error": "Failed to fetch GitHub user info."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        github_user = user_response.json()
        github_username = github_user.get("login")
        avatar_url = github_user.get("avatar_url", "")
        email = github_user.get("email", "")
        bio = github_user.get("bio", "") or ""

        try:
            # Create or update Django user + profile
            user, created = User.objects.get_or_create(
                username=github_username,
                defaults={"email": email or f"{github_username}@github.local"},
            )

            if not created and email:
                user.email = email
                user.save(update_fields=["email"])

            profile, _ = DeveloperProfile.objects.get_or_create(
                user=user,
                defaults={"github_username": github_username},
            )
            profile.avatar_url = avatar_url
            profile.bio = bio
            profile.github_username = github_username
            profile.set_github_token(access_token)
            profile.save()

            # Generate DRF auth token
            drf_token, _ = Token.objects.get_or_create(user=user)

            return Response(
                {
                    "token": drf_token.key,
                    "user": ProfileSerializer(profile).data,
                }
            )
        except Exception as e:
            import traceback

            error_msg = f"Internal server error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            return Response(
                {"error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserProfileView(APIView):
    """Return authenticated user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            profile = request.user.profile
        except DeveloperProfile.DoesNotExist:
            return Response(
                {"error": "Profile not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(ProfileSerializer(profile).data)


class DeleteAccountView(APIView):
    """Permanently delete user account and associated data."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        user = request.user
        user.delete()  # Cascade will handle all related data automatically
        return Response(
            {"message": "Account and all associated data deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class AdminLoginView(APIView):
    """Standard username/password login for admins."""
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from django.contrib.auth import authenticate

        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)
        if not user or not user.is_superuser:
            return Response(
                {"error": "Invalid admin credentials."}, status=status.HTTP_401_UNAUTHORIZED
            )

        # Ensure admin has a profile (use actual username to avoid unique constraint violations)
        profile, _ = DeveloperProfile.objects.get_or_create(
            user=user, defaults={"github_username": username, "tier": "principal"}
        )

        drf_token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": drf_token.key,
                "user": ProfileSerializer(profile).data,
            }
        )


class AdminStatsView(APIView):
    """Get system stats for the admin dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        base_queryset = DeveloperProfile.objects.select_related("user")
        stats = base_queryset.aggregate(
            total_users=Count("id"),
            avg_score=Avg("dev_score"),
            total_analyses=Count("id", filter=Q(analysis_status="complete")),
        )
        recent_users = base_queryset.order_by("-created_at").only(
            "id",
            "github_username",
            "avatar_url",
            "bio",
            "dev_score",
            "tier",
            "analysis_status",
            "last_analyzed",
            "created_at",
            "user__username",
            "user__email",
            "user__is_superuser",
        )[:50]

        users_data = ProfileSerializer(recent_users, many=True).data

        return Response(
            {
                "total_users": stats["total_users"] or 0,
                "avg_score": round(stats["avg_score"] or 0.0, 1),
                "total_analyses": stats["total_analyses"] or 0,
                "recent_users": users_data,
            }
        )


class AdminUserDetailView(APIView):
    """Admin endpoint to fetch or delete a specific user by their ID."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = DeveloperProfile.objects.get(id=user_id)
            from scoring.models import ScoreBreakdown, ScoreHistory
            from scoring.serializers import (
                ScoreBreakdownSerializer,
                ScoreHistorySerializer,
            )
            from recs.models import Recommendation
            from recs.serializers import RecommendationSerializer

            target_user = profile.user

            # Get Score Breakdown
            try:
                score_data = ScoreBreakdownSerializer(target_user.score_breakdown).data
                score_data["dev_score"] = profile.dev_score
                score_data["tier"] = profile.tier
            except ScoreBreakdown.DoesNotExist:
                score_data = None

            # Get Score History
            history = ScoreHistory.objects.filter(user=target_user).order_by(
                "-created_at"
            )[:100]
            history_data = ScoreHistorySerializer(history, many=True).data

            # Get Recommendations
            recs = Recommendation.objects.filter(user=target_user).order_by(
                "-created_at"
            )[:100]
            recs_data = RecommendationSerializer(recs, many=True).data

            # Return aggregated info
            return Response(
                {
                    "profile": ProfileSerializer(profile).data,
                    "score": score_data,
                    "history": history_data,
                    "recs": recs_data,
                }
            )
        except DeveloperProfile.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, user_id, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = DeveloperProfile.objects.get(id=user_id)
            if profile.user.is_superuser:
                return Response(
                    {"error": "Cannot delete an admin user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            profile.user.delete()
            return Response(
                {"message": "User deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
        except DeveloperProfile.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
