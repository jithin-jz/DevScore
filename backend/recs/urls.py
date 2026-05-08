from django.urls import path
from . import views

urlpatterns = [
    path("recs/", views.RecommendationListView.as_view(), name="recs-list"),
    path(
        "recs/tech/", views.TechRecommendationListView.as_view(), name="tech-recs-list"
    ),
    path(
        "recs/tech/dismiss/<int:rec_id>/",
        views.TechRecommendationDismissView.as_view(),
        name="tech-recs-dismiss",
    ),
    path(
        "recs/tech/regenerate/",
        views.TechRecommendationRegenerateView.as_view(),
        name="tech-recs-regenerate",
    ),
]
