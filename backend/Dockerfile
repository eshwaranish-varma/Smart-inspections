# Production: python 3.11-slim, prod deps only, gunicorn + uvicorn workers
FROM python:3.11-slim AS builder

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements-prod.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/* \
  && apt-get clean

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data

COPY . .

EXPOSE 8000

# Worker timeout 120s for long AI / OCR requests; logs to stdout/stderr
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

CMD ["gunicorn","app.main:app","--bind","0.0.0.0:8000","--workers","1","--worker-class","uvicorn.workers.UvicornWorker","--timeout","120","--graceful-timeout","30","--keep-alive","75","--access-logfile","-","--error-logfile","-"]
