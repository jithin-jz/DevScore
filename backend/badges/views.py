from django.http import HttpResponse
from django.views import View

from users.models import DeveloperProfile

TIER_COLORS = {
    "baseline": ("#6b7280", "#374151"),  # Gray
    "proficient": ("#3b82f6", "#1d4ed8"),  # Blue
    "advanced": ("#8b5cf6", "#6d28d9"),  # Purple
    "architect": ("#f59e0b", "#d97706"),  # Amber
    "principal": ("#ef4444", "#dc2626"),  # Red
}

TIER_LABELS = {
    "baseline": "Baseline",
    "proficient": "Proficient",
    "advanced": "Advanced",
    "architect": "Architect",
    "principal": "Principal",
}


def generate_badge_svg(score, tier):
    """Generate a dynamic SVG badge (GitProof premium style)."""
    tier_label = TIER_LABELS.get(tier, "Baseline")
    score_text = str(int(round(score) if score else 0))

    label_width = 75
    score_width = 85
    total_width = label_width + score_width

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="28" viewBox="0 0 {total_width} 28" fill="none" role="img" aria-label="DevScore: {score_text} · {tier_label}">
  <title>DevScore: {score_text} · {tier_label}</title>
  <style>
    .label {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; fill: #A1A1AA; }}
    .value {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 700; fill: #FFFFFF; }}
  </style>
  <rect width="{total_width}" height="28" rx="4" fill="#09090B"/>
  <rect x="{label_width}" width="{score_width}" height="28" fill="#27272A" />
  <rect width="{total_width}" height="28" rx="4" stroke="#3F3F46" />
  <line x1="{label_width}" y1="0" x2="{label_width}" y2="28" stroke="#3F3F46" />
  <text x="{label_width / 2}" y="18" text-anchor="middle" class="label">DevScore</text>
  <text x="{label_width + score_width / 2}" y="19" text-anchor="middle" class="value">{score_text} • {tier_label}</text>
</svg>"""
    return svg


class BadgeView(View):
    """Serve a dynamic SVG badge for a user."""

    def get(self, request, username):
        try:
            profile = DeveloperProfile.objects.get(github_username__iexact=username)
        except DeveloperProfile.DoesNotExist:
            # Return a "not found" badge
            svg = generate_badge_svg(0, "baseline")
            return HttpResponse(svg, content_type="image/svg+xml", status=404)

        svg = generate_badge_svg(profile.dev_score, profile.tier)
        response = HttpResponse(svg, content_type="image/svg+xml")
        response["Cache-Control"] = "public, max-age=300"
        return response
