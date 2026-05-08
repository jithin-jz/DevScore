from django.urls import path
from . import views

urlpatterns = [
    path("analyze/", views.TriggerAnalysisView.as_view(), name="trigger-analysis"),
    path(
        "analysis/status/", views.AnalysisStatusView.as_view(), name="analysis-status"
    ),
    path("analysis/reset/", views.ResetAnalysisView.as_view(), name="analysis-reset"),
]
