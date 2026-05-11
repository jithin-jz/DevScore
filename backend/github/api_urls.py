from django.urls import path
from . import views

urlpatterns = [
    path("repositories/", views.RepositoryListView.as_view(), name="list-repositories"),
    path(
        "repositories/<int:repo_id>/audit/",
        views.RepositoryAuditView.as_view(),
        name="audit-repository",
    ),
    # Star swipe feed — public
    path("stars/feed/", views.StarFeedView.as_view(), name="star-feed"),
    path(
        "stars/click/<int:pinned_repo_id>/",
        views.StarClickView.as_view(),
        name="star-click",
    ),
    # Pin management — auth required
    path("stars/pins/", views.PinnedRepoListView.as_view(), name="star-pins"),
    path(
        "stars/pins/<int:pin_id>/",
        views.PinnedRepoDetailView.as_view(),
        name="star-pin-detail",
    ),
]

