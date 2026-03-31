from django.apps import AppConfig


class GithubIntegrationConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "github"

    def ready(self):
        # Import tasks here to ensure they are registered for discovery
        pass
