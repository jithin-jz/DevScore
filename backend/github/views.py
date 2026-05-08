from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Repository
from .serializers import RepositorySerializer
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
