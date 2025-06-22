FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Add logging for Gunicorn
ENV PYTHONUNBUFFERED=1
ENV GUNICORN_CMD_ARGS="--access-logfile - --error-logfile -"

EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "--workers=2", "--timeout=120", "app:app"]