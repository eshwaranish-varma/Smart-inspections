# Production deployment: Docker Compose on a VPS (e.g. DigitalOcean)

Stack: **FastAPI** (Gunicorn + Uvicorn), **Next.js** (standalone), **Nginx**, **Supabase Postgres** (no local DB in default profile).

## Prerequisites

- Ubuntu 22.04+ (or similar) with SSH access  
- Domain DNS pointing at the droplet (optional for HTTPS)  
- Supabase project: `DATABASE_URL` with `?sslmode=require`  
- Copy `data/` (PDFs, KB) to the server beside the repo if you use RAG/OCR locally

## 1. Install Docker on Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
# Log out and back in for group `docker` to apply
```

## 2. Clone the repository

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO
```

## 3. Create `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

Set at minimum: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `CORS_ORIGINS`, and LLM keys (`GOOGLE_API_KEY` and/or `OPENAI_API_KEY`).  
`SUPABASE_URL` / `SUPABASE_KEY` are optional unless you use Supabase REST/Storage from the backend.

Compose injects **`BACKEND_API_URL=http://backend:8000`** for Next server routes; do not remove that override in `docker-compose.yml`.

## 4. Build and run

```bash
docker compose --env-file .env.production up --build -d
```

Build args for `NEXT_PUBLIC_*` are taken from the same env file.

## 5. Verify

```bash
# FastAPI health (direct to container port if published)
curl -sS http://127.0.0.1:8000/api/health | jq .

# Through Nginx (port 80 by default)
curl -sS http://127.0.0.1/api/health | jq .
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
```

## 6. Logs

```bash
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f gui
docker compose --env-file .env.production logs -f nginx
```

## 7. HTTPS (optional)

### Option A — Caddy (automatic Let’s Encrypt)

Install Caddy on the host, proxy to `127.0.0.1:80` (nginx), or terminate TLS and proxy to backend/gui (advanced). Example `Caddyfile`:

```caddy
your-domain.com {
  reverse_proxy localhost:80
}
```

### Option B — Certbot + Nginx

Install certbot, obtain certs for your domain, add a second `server { listen 443 ssl; ... }` block in a new conf mounted into the nginx container, or run certbot on the host and mount `/etc/letsencrypt` read-only into nginx.

For a minimal path, use **Caddy** on the host in front of Docker Nginx on port 80.

## Routing note

Nginx sends **FastAPI** only paths under  
`/api/(observations|ai|documents|ocr|library|citations|references|health|eval|evaluation|eir-pipeline)`.  
All other **`/api/*`** requests go to **Next.js** (auth, inspections, etc.). Do not route all `/api` to FastAPI.

## Troubleshooting

- **Compose can’t find variables:** always pass `--env-file .env.production` for both build and up.  
- **Database ECONNRESET:** verify Supabase URI, IPv4, `sslmode=require`, and outbound 5432/6543.  
- **504 on AI routes:** Nginx timeouts are 180s; Gunicorn worker timeout is 120s — increase both if you run very long generations.
