# Optimized Production Dockerfiles

## Backend - Production (Optimized)

> **File location:** `backend/Dockerfile.prod`

```dockerfile
# Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-prod.txt .

# Create wheels for better layer caching
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements-prod.txt

---

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements-prod.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements-prod.txt && \
    rm -rf /wheels

# Copy app
COPY app/ app/

# Set environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Change ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# Expose port
EXPOSE 8000

# Start with gunicorn for production
CMD ["gunicorn", \
     "app.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100"]
```

## Frontend - Production (Optimized)

> **File location:** `frontend/Dockerfile.prod`

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

---

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start Next.js
ENV NODE_ENV production

CMD ["node_modules/.bin/next", "start"]
```

## Docker Compose - Production

> **File location:** `docker-compose.prod.yml`

```yaml
version: "3.8"

services:
  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: smart-inspection-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      ENVIRONMENT: production
      DATABASE_URL: ${DATABASE_URL}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY:-}
      LLM_PROVIDER: ${LLM_PROVIDER:-google}
      CORS_ORIGINS: '["https://smart-inspection.vercel.app"]'
      LOG_LEVEL: info
      WORKERS: "2"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    depends_on:
      - postgres
    networks:
      - smart-inspection
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: smart-inspection-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      NEXT_PUBLIC_API_BASE_URL: http://backend:8000
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - smart-inspection
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: smart-inspection-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-smart_inspection}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./data/pipeline_logging_schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./data/title_21_CFR_schema.sql:/docker-entrypoint-initdb.d/02-cfr.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - smart-inspection
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: smart-inspection-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    networks:
      - smart-inspection
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
    driver: local

networks:
  smart-inspection:
    driver: bridge
```

## Environment File - Production

> **File location:** `.env.production`

```bash
# ============================================
# ENVIRONMENT
# ============================================
ENVIRONMENT=production
LOG_LEVEL=INFO

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@host:6543/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=smart_inspection

# ============================================
# SUPABASE
# ============================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# ============================================
# LLM & API KEYS
# ============================================
OPENAI_API_KEY=sk-proj-xxxxx
GOOGLE_API_KEY=AIzaSy...
LLM_PROVIDER=google

# ============================================
# API CONFIGURATION
# ============================================
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
CORS_ORIGINS=["https://app.yourdomain.com", "https://smart-inspection.vercel.app"]

# ============================================
# DEPLOYMENT
# ============================================
NODE_ENV=production
WORKERS=2
```

## Production Build Commands

```bash
# Build images with BuildKit (better caching)
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.prod.yml build --parallel

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Health status
docker-compose -f docker-compose.prod.yml ps

# Perform upgrade (with zero downtime)
docker-compose -f docker-compose.prod.yml pull && \
docker-compose -f docker-compose.prod.yml up -d
```

