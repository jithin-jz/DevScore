import logging
from datetime import datetime, timezone

from background_task import background
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime

from .models import Repository, ContributionMetrics
from .github_client import GitHubClient

logger = logging.getLogger(__name__)


def _parse_github_datetime(value):
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _apply_repo_features(repo, features, analyzed_at):
    repo.has_ci = features["has_ci"]
    repo.has_tests = features["has_tests"]
    repo.has_docker = features["has_docker"]
    repo.has_lint = features["has_lint"]
    repo.has_types = features["has_types"]
    repo.analyzed_at = analyzed_at


@background(schedule=0)
def fetch_repositories(user_id):
    """Fetch all repositories for a user from GitHub and upsert into DB."""
    try:
        user = User.objects.get(id=user_id)
        profile = user.profile
        profile.analysis_status = "analyzing"
        profile.save(update_fields=["analysis_status"])

        client = GitHubClient(profile.get_github_token())
        repos = client.get_user_repos()

        if repos is None:
            raise Exception("Failed to fetch repositories from GitHub")

        repo_payloads = []
        for repo_data in repos:
            if repo_data.get("private"):
                continue

            repo_payloads.append(
                {
                    "full_name": repo_data["full_name"],
                    "name": repo_data["name"],
                    "description": repo_data.get("description") or "",
                    "primary_language": repo_data.get("language") or "",
                    "stars": repo_data.get("stargazers_count", 0),
                    "forks": repo_data.get("forks_count", 0),
                    "is_fork": repo_data.get("fork", False),
                    "size_kb": repo_data.get("size", 0),
                    "open_issues_count": repo_data.get("open_issues_count", 0),
                    "repo_created_at": _parse_github_datetime(
                        repo_data.get("created_at")
                    ),
                    "repo_updated_at": _parse_github_datetime(
                        repo_data.get("updated_at")
                    ),
                }
            )

        existing_map = {
            repo.full_name: repo
            for repo in Repository.objects.filter(
                user=user,
                full_name__in=[payload["full_name"] for payload in repo_payloads],
            )
        }

        update_fields = [
            "name",
            "description",
            "primary_language",
            "stars",
            "forks",
            "is_fork",
            "size_kb",
            "open_issues_count",
            "repo_created_at",
            "repo_updated_at",
        ]
        to_create = []
        to_update = []

        for payload in repo_payloads:
            existing = existing_map.get(payload["full_name"])
            if existing:
                changed = False
                for field in update_fields:
                    value = payload[field]
                    if getattr(existing, field) != value:
                        setattr(existing, field, value)
                        changed = True
                if changed:
                    to_update.append(existing)
            else:
                to_create.append(Repository(user=user, **payload))

        if to_create:
            Repository.objects.bulk_create(to_create, batch_size=200)
        if to_update:
            Repository.objects.bulk_update(to_update, update_fields, batch_size=200)

        logger.info(
            "Fetched %s public repos for %s (created=%s updated=%s unchanged=%s)",
            len(repo_payloads),
            user.username,
            len(to_create),
            len(to_update),
            len(repo_payloads) - len(to_create) - len(to_update),
        )

        # Trigger next step: fetch contribution metrics
        fetch_contribution_metrics(user_id)

    except Exception as exc:
        logger.error(f"Error fetching repos for user {user_id}: {exc}")
        try:
            profile = User.objects.get(id=user_id).profile
            profile.analysis_status = "failed"
            profile.save(update_fields=["analysis_status"])
        except Exception:
            pass
        raise exc


@background(schedule=0)
def fetch_contribution_metrics(user_id):
    """Aggregate contribution metrics from GitHub events API."""
    try:
        user = User.objects.get(id=user_id)
        client = GitHubClient(user.profile.get_github_token())
        events = client.get_user_events(user.username)

        if events is None:
            events = []

        commits = 0
        pr_opened = 0
        pr_merged = 0
        issues_opened = 0
        issues_closed = 0
        external = 0
        active_dates = set()
        user_repos = set(
            Repository.objects.filter(user=user).values_list("full_name", flat=True)
        )

        for event in events:
            event_type = event.get("type")
            created = event.get("created_at", "")[:10]
            if created:
                active_dates.add(created)

            repo_name = event.get("repo", {}).get("name", "")

            if event_type == "PushEvent":
                payload = event.get("payload", {})
                commits += payload.get("size", 0)
            elif event_type == "PullRequestEvent":
                action = event.get("payload", {}).get("action")
                if action == "opened":
                    pr_opened += 1
                    if repo_name not in user_repos:
                        external += 1
                elif action == "closed" and event.get("payload", {}).get(
                    "pull_request", {}
                ).get("merged"):
                    pr_merged += 1
            elif event_type == "IssuesEvent":
                action = event.get("payload", {}).get("action")
                if action == "opened":
                    issues_opened += 1
                elif action == "closed":
                    issues_closed += 1

        # Calculate streak
        sorted_dates = sorted(active_dates)
        max_streak = 0
        current_streak = 1
        for i in range(1, len(sorted_dates)):
            d1 = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d")
            d2 = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
            if (d2 - d1).days == 1:
                current_streak += 1
            else:
                max_streak = max(max_streak, current_streak)
                current_streak = 1
        max_streak = max(max_streak, current_streak) if sorted_dates else 0

        ContributionMetrics.objects.update_or_create(
            user=user,
            defaults={
                "total_commits": commits,
                "pr_opened": pr_opened,
                "pr_merged": pr_merged,
                "issues_opened": issues_opened,
                "issues_closed": issues_closed,
                "external_contributions": external,
                "active_days": len(active_dates),
                "streak_max": max_streak,
                "last_fetched": datetime.now(timezone.utc),
            },
        )

        logger.info(f"Fetched contribution metrics for {user.username}")

        # Trigger next step: analyze all repos
        analyze_all_repos_task(user_id)

    except Exception as exc:
        logger.error(f"Error fetching metrics for user {user_id}: {exc}")
        try:
            profile = User.objects.get(id=user_id).profile
            profile.analysis_status = "failed"
            profile.save(update_fields=["analysis_status"])
        except Exception:
            pass
        raise exc


@background(schedule=0)
def analyze_all_repos_task(user_id):
    """Analyze all repositories for a user synchronously in the background."""
    try:
        user = User.objects.select_related("profile").get(id=user_id)
        client = GitHubClient(user.profile.get_github_token())
        repos = list(Repository.objects.filter(user_id=user_id))

        stale_repos = []
        for repo in repos:
            if repo.analyzed_at is None:
                stale_repos.append(repo)
                continue
            if repo.repo_updated_at and repo.analyzed_at < repo.repo_updated_at:
                stale_repos.append(repo)

        max_repos_per_run = int(getattr(settings, "ANALYZE_MAX_REPOS_PER_RUN", 120))
        total_stale = len(stale_repos)
        if max_repos_per_run > 0 and len(stale_repos) > max_repos_per_run:
            stale_repos = sorted(
                stale_repos,
                key=lambda repo: (
                    repo.repo_updated_at or datetime.min.replace(tzinfo=timezone.utc)
                ),
                reverse=True,
            )[:max_repos_per_run]

        if stale_repos:
            analyzed_at = datetime.now(timezone.utc)
            updated_repos = []
            for repo in stale_repos:
                try:
                    features = client.detect_repo_features(repo.full_name)
                    _apply_repo_features(repo, features, analyzed_at)
                    updated_repos.append(repo)
                except Exception as exc:
                    logger.error(f"Error analyzing repo {repo.id}: {exc}")

            if updated_repos:
                Repository.objects.bulk_update(
                    updated_repos,
                    [
                        "has_ci",
                        "has_tests",
                        "has_docker",
                        "has_lint",
                        "has_types",
                        "analyzed_at",
                    ],
                    batch_size=100,
                )

        analyzed_count = len(stale_repos)
        deferred_count = max(total_stale - analyzed_count, 0)
        up_to_date_count = max(len(repos) - total_stale, 0)
        logger.info(
            "Analyzed repositories for user %s (total=%s stale=%s analyzed=%s deferred=%s up_to_date=%s)",
            user.username,
            len(repos),
            total_stale,
            analyzed_count,
            deferred_count,
            up_to_date_count,
        )

        # Trigger next step: scoring
        from scoring.tasks import calculate_user_score

        calculate_user_score(user_id)

    except Exception as exc:
        logger.error(f"Error in analyze_all_repos_task for user {user_id}: {exc}")
        try:
            profile = User.objects.get(id=user_id).profile
            profile.analysis_status = "failed"
            profile.save(update_fields=["analysis_status"])
        except Exception:
            pass
        raise exc


def _perform_repo_analysis(repo_id):
    """Internal helper to analyze a repo (replaces the shared_task version for synchronous call)."""
    try:
        repo = Repository.objects.select_related("user__profile").get(id=repo_id)
        client = GitHubClient(repo.user.profile.get_github_token())

        features = client.detect_repo_features(repo.full_name)
        _apply_repo_features(repo, features, datetime.now(timezone.utc))
        repo.save(
            update_fields=[
                "has_ci",
                "has_tests",
                "has_docker",
                "has_lint",
                "has_types",
                "analyzed_at",
            ]
        )

        logger.info(f"Analyzed repo {repo.full_name}")

    except Exception as exc:
        logger.error(f"Error analyzing repo {repo_id}: {exc}")


@background(schedule=0)
def analyze_repository(repo_id):
    """Keep this for direct calls if needed, but it uses the helper now."""
    _perform_repo_analysis(repo_id)


@background(schedule=0)
def deep_audit_repository(repo_id):
    """Perform a deep AI audit of a specific repository."""
    from .models import Repository, RepositoryAudit
    from analytics.auditor import perform_deep_audit

    try:
        repo = Repository.objects.select_related("user__profile").get(id=repo_id)
        token = repo.user.profile.get_github_token()

        audit_data = perform_deep_audit(repo, token)
        if audit_data:
            RepositoryAudit.objects.update_or_create(
                repository=repo,
                defaults={
                    "summary": audit_data.get("summary", ""),
                    "strengths": audit_data.get("strengths", []),
                    "weaknesses": audit_data.get("weaknesses", []),
                    "suggestions": audit_data.get("suggestions", []),
                    "architecture_score": audit_data.get("architecture_score", 0),
                },
            )
            logger.info(f"Completed deep audit for {repo.full_name}")

    except Exception as exc:
        logger.error(f"Error auditing repo {repo_id}: {exc}")
        raise exc
