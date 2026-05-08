from django.urls import path
from . import views

urlpatterns = [
    path("repositories/", views.RepositoryListView.as_view(), name="list-repositories"),
    path(
        "repositories/<int:repo_id>/audit/",
        views.RepositoryAuditView.as_view(),
        name="audit-repository",
    ),
]
