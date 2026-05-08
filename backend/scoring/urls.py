from django.urls import path
from . import views

urlpatterns = [
    path("score/", views.ScoreDetailView.as_view(), name="score-detail"),
    path("score/history/", views.ScoreHistoryView.as_view(), name="score-history"),
]
