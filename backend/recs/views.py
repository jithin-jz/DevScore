from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Recommendation, TechRecommendation
from .serializers import RecommendationSerializer, TechRecommendationSerializer
from .tasks import generate_tech_recs_task


class RecommendationListView(APIView):
    """Get current recs for authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = Recommendation.objects.filter(user=request.user, is_resolved=False).only(
            "id",
            "category",
            "title",
            "description",
            "priority",
            "action_url",
            "is_resolved",
            "created_at",
        )
        return Response(RecommendationSerializer(recs, many=True).data)


class TechRecommendationListView(APIView):
    """Get current tech recommendations for authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = TechRecommendation.objects.filter(
            user=request.user, is_dismissed=False
        ).only(
            "id",
            "technology",
            "category",
            "reason",
            "learning_resources",
            "priority",
            "career_impact",
            "is_dismissed",
            "created_at",
        )
        return Response(TechRecommendationSerializer(recs, many=True).data)


class TechRecommendationDismissView(APIView):
    """Dismiss a tech recommendation."""
    permission_classes = [IsAuthenticated]

    def post(self, request, rec_id):
        try:
            rec = TechRecommendation.objects.get(id=rec_id, user=request.user)
            rec.is_dismissed = True
            rec.save()
            return Response({"status": "dismissed"})
        except TechRecommendation.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class TechRecommendationRegenerateView(APIView):
    """Manually regenerate tech recommendations."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        generate_tech_recs_task(request.user.id)
        return Response({"status": "regeneration started"})
