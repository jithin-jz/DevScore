import random
from datetime import timedelta
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Repository, PinnedRepo, RepoClickEvent
from .serializers import RepositorySerializer, PinnedRepoCardSerializer, PinnedRepoManageSerializer
from .tasks import deep_audit_repository


class RepositoryListView(APIView):
    """List all repositories for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        repos = (
            Repository.objects.filter(user=request.user)
            .select_related("audit")
            .only(
                "id",
                "name",
                "full_name",
                "description",
                "primary_language",
                "stars",
                "forks",
                "is_fork",
                "has_ci",
                "has_tests",
                "has_docker",
                "has_lint",
                "has_types",
                "repo_updated_at",
                "audit__summary",
                "audit__strengths",
                "audit__weaknesses",
                "audit__suggestions",
                "audit__architecture_score",
                "audit__audited_at",
            )
        )
        serializer = RepositorySerializer(repos, many=True)
        return Response(serializer.data)


class RepositoryAuditView(APIView):
    """Trigger a deep AI audit for a specific repository."""

    permission_classes = [IsAuthenticated]

    def post(self, request, repo_id):
        try:
            repo = Repository.objects.get(id=repo_id, user=request.user)
        except Repository.DoesNotExist:
            return Response(
                {"error": "Repository not found."}, status=status.HTTP_404_NOT_FOUND
            )

        deep_audit_repository(repo.id)
        return Response({"status": "Audit pipeline started."})


class StarFeedView(APIView):
    """Public feed of pinned repos for the swipe UI. No auth required."""

    permission_classes = [AllowAny]

    def get(self, request):
        # Exclude already-seen cards (sent as ?seen_ids=1,2,3)
        raw = request.query_params.get("seen_ids", "")
        seen_ids = [int(x) for x in raw.split(",") if x.strip().isdigit()]

        cutoff_48h = timezone.now() - timedelta(hours=48)

        # Boosted pool: pinned within the last 48 h
        boosted_qs = (
            PinnedRepo.objects.filter(pinned_at__gte=cutoff_48h)
            .exclude(id__in=seen_ids)
            .select_related("repository", "user")
            .order_by("?")
        )
        boosted = list(boosted_qs[:2])

        # Regular pool: pinned older than 48 h
        fill_count = 6 - len(boosted)
        boosted_ids = [b.id for b in boosted]
        regular_qs = (
            PinnedRepo.objects.filter(pinned_at__lt=cutoff_48h)
            .exclude(id__in=seen_ids + boosted_ids)
            .select_related("repository", "user")
            .order_by("?")
        )
        regular = list(regular_qs[:fill_count])

        # Shuffle first-6 positions
        first_six = boosted + regular
        random.shuffle(first_six)

        # Remaining batch (up to 20 more cards)
        first_six_ids = [r.id for r in first_six]
        rest = list(
            PinnedRepo.objects.exclude(id__in=seen_ids + first_six_ids)
            .select_related("repository", "user")
            .order_by("?")
            [:20]
        )

        feed = first_six + rest
        serializer = PinnedRepoCardSerializer(feed, many=True)
        return Response(serializer.data)


class StarClickView(APIView):
    """Record a click-through event (visitor intent to star on GitHub). No auth required."""

    permission_classes = [AllowAny]

    def post(self, request, pinned_repo_id):
        session_id = request.data.get("session_id", "").strip()
        if not session_id:
            return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(session_id) > 64:
            return Response({"error": "Invalid session_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pinned = PinnedRepo.objects.select_related("repository").get(id=pinned_repo_id)
        except PinnedRepo.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        _, created = RepoClickEvent.objects.get_or_create(
            pinned_repo=pinned, session_id=session_id
        )
        if created:
            PinnedRepo.objects.filter(id=pinned_repo_id).update(
                click_count=pinned.click_count + 1,
                weekly_clicks=pinned.weekly_clicks + 1,
            )

        return Response({"github_url": pinned.github_url})


class PinnedRepoListView(APIView):
    """Authenticated user: list their pinned repos and pin a new one."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        pins = PinnedRepo.objects.filter(user=request.user).select_related("repository")
        serializer = PinnedRepoManageSerializer(pins, many=True)
        return Response(serializer.data)

    def post(self, request):
        repo_id = request.data.get("repository_id")
        if not repo_id:
            return Response(
                {"error": "repository_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        # Verify the repo belongs to the requesting user
        try:
            repo = Repository.objects.get(id=repo_id, user=request.user)
        except Repository.DoesNotExist:
            return Response(
                {"error": "Repository not found."}, status=status.HTTP_404_NOT_FOUND
            )
        # Enforce max 2 pinned repos
        current_count = PinnedRepo.objects.filter(user=request.user).count()
        already_pinned = PinnedRepo.objects.filter(
            user=request.user, repository=repo
        ).exists()
        if current_count >= 2 and not already_pinned:
            return Response(
                {"error": "You can only pin up to 2 repositories. Unpin one first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Upsert: create or re-pin (auto_now=True on pinned_at resets the boost timer)
        pinned, _ = PinnedRepo.objects.get_or_create(
            user=request.user, repository=repo
        )
        # Force save to update pinned_at (auto_now)
        pinned.save()
        serializer = PinnedRepoManageSerializer(pinned)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PinnedRepoDetailView(APIView):
    """Authenticated user: unpin a specific repo."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pin_id):
        try:
            pin = PinnedRepo.objects.get(id=pin_id, user=request.user)
        except PinnedRepo.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        pin.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
