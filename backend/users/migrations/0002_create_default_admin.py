from django.db import migrations
from django.contrib.auth.hashers import make_password


def create_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    DeveloperProfile = apps.get_model("users", "DeveloperProfile")
    if not User.objects.filter(username="jithin").exists():
        user = User.objects.create(
            username="jithin",
            email="jithin@devscore.local",
            password=make_password("admin"),
            is_staff=True,
            is_superuser=True,
        )
        DeveloperProfile.objects.get_or_create(
            user=user, defaults={"github_username": "jithin_admin", "tier": "principal"}
        )


def remove_admin(apps, schema_editor):
    User = apps.get_model("auth", "User")
    User.objects.filter(username="jithin").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_admin, remove_admin),
    ]
