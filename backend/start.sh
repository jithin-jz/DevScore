#!/bin/sh

# Exit on any error
set -e

echo "--- Starting Initialization ---"

# Step 1: Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Step 2: Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Step 3: Create admin if not exists
if [ -f "create_admin.py" ]; then
    echo "Creating admin user..."
    python create_admin.py
fi

echo "--- Services Starting ---"

# Start the background worker in a loop
# This ensures it restarts if it crashes or hits a timeout
(
    echo "Background worker started."
    while true; do
        python manage.py process_tasks --duration 600
        echo "Worker process exited, restarting in 5s..."
        sleep 5
    done
) &

# Start the web server (Gunicorn)
# We use exec so gunicorn receives signals (like SIGTERM) directly
echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile - --error-logfile -
