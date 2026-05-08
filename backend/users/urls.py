from django.urls import path
from . import views

urlpatterns = [
    path("github/login/", views.GithubLoginView.as_view(), name="github-login"),
]
