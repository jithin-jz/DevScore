import logging
from datetime import datetime, timezone, timedelta

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from github.tasks import fetch_repositories
from users.models import DeveloperProfile

logger = logging.getLogger(__name__)

# How long before a pending/analyzing status is considered stale
STALE_ANALYSIS_TIMEOUT = timedelta(minutes=10)


class TriggerAnalysisView(APIView):
    """
    Trigger the full analysis pipeline for the authenticated user.
    Pipeline: fetch repos → fetch metrics → analyze each repo → calculate score → generate recs → generate tech recs
    (Executed via a chain of background tasks)
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        with transaction.atomic():
            profile = DeveloperProfile.objects.select_for_update().get(
                user=request.user
            )

            if profile.analysis_status in ("pending", "analyzing"):
                # Check if the analysis is stale (stuck for too long)
                time_since_update = datetime.now(timezone.utc) - profile.updated_at
                if time_since_update > STALE_ANALYSIS_TIMEOUT:
                    logger.warning(
                        "Resetting stale analysis for user %s (stuck in '%s' for %s)",
                        request.user.username,
                        profile.analysis_status,
                        time_since_update,
                    )
                    # Fall through to allow re-analysis
                else:
                    return Response(
                        {"error": "Analysis is already in progress."},
                        status=status.HTTP_409_CONFLICT,
                    )

            profile.analysis_status = "pending"
            profile.save(update_fields=["analysis_status"])

            # Also clear any old tasks that might be stuck in the queue for this user
            # to ensure the worker picks up the NEW one first.
            try:
                from background_task.models import Task

                # We search for tasks where the user_id was passed as a positional arg
                # In django-background-tasks, it's stored as [[user_id], {}] in task_params field
                user_id_str = f"[[{request.user.id}],"
                Task.objects.filter(task_params__contains=user_id_str).delete()
            except Exception as e:
                logger.warning(f"Could not clear old tasks: {e}")

        # Start the chain by calling the first task
        fetch_repositories(request.user.id)

        return Response({"status": "Analysis pipeline started."})


class AnalysisStatusView(APIView):
    """Get the current analysis pipeline status."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = DeveloperProfile.objects.only("analysis_status", "last_analyzed").get(
            user=request.user
        )
        return Response(
            {
                "status": profile.analysis_status,
                "last_analyzed": profile.last_analyzed,
            }
        )


class ResetAnalysisView(APIView):
    """Reset a stuck analysis back to idle so user can re-trigger."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = DeveloperProfile.objects.get(user=request.user)
        if profile.analysis_status in ("pending", "analyzing"):
            profile.analysis_status = "idle"
            profile.save(update_fields=["analysis_status"])
            logger.info(f"Manual analysis reset for user {request.user.username}")
            return Response({"status": "Analysis reset to idle."})
        return Response(
            {"status": f"No reset needed. Current status: {profile.analysis_status}"}
        )
