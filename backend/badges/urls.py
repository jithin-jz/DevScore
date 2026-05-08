from django.urls import path
from . import views

urlpatterns = [
    path("<str:username>.svg", views.BadgeView.as_view(), name="badge"),
]
