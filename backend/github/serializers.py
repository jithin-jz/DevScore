from rest_framework import serializers
from .models import Repository, RepositoryAudit, PinnedRepo


class RepositoryAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepositoryAudit
        fields = [
            "summary",
            "strengths",
            "weaknesses",
            "suggestions",
            "architecture_score",
            "audited_at",
        ]


class RepositorySerializer(serializers.ModelSerializer):
    audit = RepositoryAuditSerializer(read_only=True)

    class Meta:
        model = Repository
        fields = [
            "id",
            "name",
            "full_name",
            "description",
            "primary_language",
            "stars",
            "forks",
            "is_fork",
            "has_ci",
            "has_tests",
            "has_docker",
            "has_lint",
            "has_types",
            "repo_updated_at",
            "audit",
        ]


class PinnedRepoCardSerializer(serializers.ModelSerializer):
    """Public feed card — safe to return to unauthenticated visitors."""

    repo_id = serializers.IntegerField(source="repository.id", read_only=True)
    name = serializers.CharField(source="repository.name", read_only=True)
    full_name = serializers.CharField(source="repository.full_name", read_only=True)
    description = serializers.CharField(source="repository.description", read_only=True)
    primary_language = serializers.CharField(
        source="repository.primary_language", read_only=True
    )
    stars = serializers.IntegerField(source="repository.stars", read_only=True)
    forks = serializers.IntegerField(source="repository.forks", read_only=True)
    has_ci = serializers.BooleanField(source="repository.has_ci", read_only=True)
    has_tests = serializers.BooleanField(source="repository.has_tests", read_only=True)
    has_docker = serializers.BooleanField(source="repository.has_docker", read_only=True)
    has_lint = serializers.BooleanField(source="repository.has_lint", read_only=True)
    has_types = serializers.BooleanField(source="repository.has_types", read_only=True)
    github_url = serializers.CharField(read_only=True)
    owner_username = serializers.CharField(
        source="user.username", read_only=True
    )
    owner_avatar = serializers.SerializerMethodField()
    dev_score = serializers.SerializerMethodField()
    is_boosted = serializers.BooleanField(read_only=True)

    class Meta:
        model = PinnedRepo
        fields = [
            "id",
            "repo_id",
            "name",
            "full_name",
            "description",
            "primary_language",
            "stars",
            "forks",
            "has_ci",
            "has_tests",
            "has_docker",
            "has_lint",
            "has_types",
            "github_url",
            "owner_username",
            "owner_avatar",
            "dev_score",
            "click_count",
            "weekly_clicks",
            "is_boosted",
            "pinned_at",
        ]

    def get_owner_avatar(self, obj):
        profile = getattr(obj.user, "profile", None)
        if profile and hasattr(profile, "avatar_url"):
            return profile.avatar_url
        # Fall back to github avatar from user profile if available
        try:
            return obj.user.profile.avatar_url
        except Exception:
            return f"https://github.com/{obj.user.username}.png"

    def get_dev_score(self, obj):
        try:
            return round(obj.user.score_breakdown.engineering_depth, 0)
        except Exception:
            return None


class PinnedRepoManageSerializer(serializers.ModelSerializer):
    """For authenticated users to manage their pinned repos."""

    repo_id = serializers.IntegerField(source="repository.id", read_only=True)
    name = serializers.CharField(source="repository.name", read_only=True)
    full_name = serializers.CharField(source="repository.full_name", read_only=True)
    primary_language = serializers.CharField(
        source="repository.primary_language", read_only=True
    )
    stars = serializers.IntegerField(source="repository.stars", read_only=True)
    github_url = serializers.CharField(read_only=True)

    class Meta:
        model = PinnedRepo
        fields = [
            "id",
            "repo_id",
            "name",
            "full_name",
            "primary_language",
            "stars",
            "github_url",
            "click_count",
            "weekly_clicks",
            "pinned_at",
        ]
