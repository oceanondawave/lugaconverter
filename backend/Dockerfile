# Use a slim Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y libmagic1 && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire app
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV GUNICORN_CMD_ARGS="--workers=2 --timeout=60 --access-logfile - --error-logfile -"

# Expose port (optional, but good practice)
EXPOSE 8080

# Run Gunicorn (ensure it binds to 0.0.0.0)
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]