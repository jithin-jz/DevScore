from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ScoreBreakdown, ScoreHistory
from .serializers import ScoreBreakdownSerializer, ScoreHistorySerializer


class ScoreDetailView(APIView):
    """Get current score breakdown for authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            breakdown = ScoreBreakdown.objects.get(user=request.user)
        except ScoreBreakdown.DoesNotExist:
            return Response(
                {
                    "engineering_depth": 0,
                    "collaboration": 0,
                    "discipline": 0,
                    "consistency": 0,
                    "oss_impact": 0,
                    "last_calculated": None,
                }
            )
        return Response(ScoreBreakdownSerializer(breakdown).data)


class ScoreHistoryView(APIView):
    """Get historical score entries for authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        history = ScoreHistory.objects.filter(user=request.user).only(
            "score", "breakdown_snapshot", "created_at"
        )[:50]
        return Response(ScoreHistorySerializer(history, many=True).data)
