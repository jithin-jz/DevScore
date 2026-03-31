import os
import django
from django.contrib.auth import get_user_model

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


def ensure_admin():
    User = get_user_model()
    username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
    email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@devscore.app")
    password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "devscore_password")

    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser {username}...")
        User.objects.create_superuser(username=username, email=email, password=password)
    else:
        print(f"Superuser {username} already exists.")


if __name__ == "__main__":
    ensure_admin()
