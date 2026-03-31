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

# Make the start script executable
RUN chmod +x start.sh

EXPOSE 8000

# Default command: use our new startup manager
CMD ["./start.sh"]
