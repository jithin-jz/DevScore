from django.urls import path
from . import views

urlpatterns = [
    path("me/", views.UserProfileView.as_view(), name="me"),
    path("delete-account/", views.DeleteAccountView.as_view(), name="delete-account"),
    path("leaderboard/", views.LeaderboardView.as_view(), name="leaderboard"),
    path("admin/login/", views.AdminLoginView.as_view(), name="admin-login"),
    path("admin/stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path(
        "admin/users/<int:user_id>/", views.AdminUserDetailView.as_view(), name="admin-delete-user"
    ),
]
