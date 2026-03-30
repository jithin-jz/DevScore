FROM python:3.12-slim

WORKDIR /app

# System dependencies for Postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements from backend folder
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code into the container
COPY backend/ .

EXPOSE 8000

# Default command: run background task worker alongside gunicorn
CMD ["sh", "-c", "python manage.py collectstatic --noinput && python manage.py migrate --noinput && python create_admin.py && (while true; do python manage.py process_tasks --duration 300 2>&1; echo 'process_tasks exited, restarting in 5s...'; sleep 5; done) & gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"]
