FROM python:3.12-slim

WORKDIR /app

# Install system deps for psycopg2 and other utilities
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY . .

# Create necessary directories for uploads
RUN mkdir -p uploads/screenshots uploads/recordings

EXPOSE 5000

# Gunicorn with 4 workers, 2 threads, 600s timeout for long-running SSE
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "4", \
     "--threads", "2", \
     "--timeout", "600", \
     "--keep-alive", "5", \
     "app:create_app()"]
