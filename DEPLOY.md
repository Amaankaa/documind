# Deploying AlgoMentor

Production guide for a single VPS (DigitalOcean Droplet or similar) with Docker Compose, Caddy HTTPS, and GitHub Actions CD.

**Live instance:** https://app.algomentor.me

---

## Architecture

```text
app.yourdomain.com  ──► Caddy (443) ──► frontend :3000 (Next.js standalone)
api.yourdomain.com  ──► Caddy (443) ──► backend  :8000 (FastAPI)
postgres            ──► internal only (pgvector)
uploads             ──► Docker volume (USE_LOCAL_STORAGE=true)
```

No Redis or Celery in production — set `USE_CELERY=false` and run ingestion in-process.

---

## 1. Server requirements

| Resource | Minimum |
|----------|---------|
| VPS | 2 GB RAM, 1 vCPU (e.g. DigitalOcean $12/mo) |
| OS | Ubuntu 24.04 LTS |
| Ports | 22, 80, 443 open |

---

## 2. First-time server setup

### Install Docker & Caddy

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### Clone the repo

```bash
git clone https://github.com/Amaankaa/documind.git /root/documind
cd /root/documind
```

### Environment files

```bash
cp .env.production.example .env
openssl rand -hex 32   # use for POSTGRES_PASSWORD in .env

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env` — required for production:

```env
GEMINI_API_KEY=...
LLM_PROVIDER=gemini
LLM_CREDENTIALS_SECRET=<openssl rand -hex 32>

CLERK_SECRET_KEY=sk_live_...
CLERK_JWKS_URL=https://clerk.yourdomain.me/.well-known/jwks.json

USE_CELERY=false
COMMUNITY_SYNC_ON_STARTUP=true
COMMUNITY_SYNC_INTERVAL_HOURS=0
USE_LOCAL_STORAGE=true

ALLOWED_ORIGINS=["https://app.yourdomain.me"]
QUERY_DAILY_LIMIT_PER_USER=3
```

Edit `frontend/.env.local` — **build-time** vars:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_API_URL=https://api.yourdomain.me
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/map
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/map
```

```bash
chmod 600 .env backend/.env frontend/.env.local
```

### Start the stack

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### Caddy (`/etc/caddy/Caddyfile`)

```caddy
api.yourdomain.me {
    reverse_proxy 127.0.0.1:8000
}

app.yourdomain.me {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
systemctl reload caddy
```

---

## 3. DNS (Namecheap or DigitalOcean)

| Type | Host | Value |
|------|------|-------|
| A | `app` | Droplet IP |
| A | `api` | Droplet IP |

**Clerk Production** (5 CNAME records) — see Clerk Dashboard → Configure → Domains.

---

## 4. Clerk production checklist

1. Create **Production** instance for `app.yourdomain.me`
2. Verify all DNS records (5/5)
3. Copy **live** keys into server env files
4. Set redirect URLs → `https://app.yourdomain.me/map`
5. Configure Google OAuth in Production if using social sign-in
6. Rebuild frontend after any `NEXT_PUBLIC_*` change:

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

---

## 5. CI/CD (GitHub Actions)

### CI (every push & PR)

- Backend: `pytest`
- Frontend: `eslint` + `next build`

Workflow: `.github/workflows/ci.yml`

### CD (push to `main` only)

After CI passes, deploys via SSH using `scripts/deploy.sh`:

1. `git fetch` + reset to `origin/main`
2. `docker compose -f docker-compose.prod.yml build`
3. `docker compose up -d`

### Required GitHub secrets

Repo → **Settings → Secrets and variables → Actions** → **Secrets**:

| Secret | Example | Description |
|--------|---------|-------------|
| `DROPLET_HOST` | `164.92.x.x` | Droplet public IP |
| `DROPLET_USER` | `root` | SSH user |
| `DROPLET_SSH_KEY` | `-----BEGIN OPENSSH...` | Private key (full contents) |
| `DEPLOY_PATH` | `/root/documind` | Optional; defaults to `/root/documind` |

### Enable CD

Repo → **Settings → Secrets and variables → Actions** → **Variables**:

| Variable | Value |
|----------|-------|
| `ENABLE_CD` | `true` |

CD is **off by default** until you set `ENABLE_CD=true` (prevents failed deploys before secrets exist).

### GitHub environment (optional)

Create environment **`production`** under Settings → Environments to require manual approval before deploy.

### Server SSH key for Actions

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/algomentor_deploy
```

Add `algomentor_deploy.pub` to server `~/.ssh/authorized_keys`.  
Paste `algomentor_deploy` (private key) into GitHub secret `DROPLET_SSH_KEY`.

### Manual deploy

```bash
ssh root@<DROPLET_IP>
cd /root/documind && git pull origin main && bash scripts/deploy.sh
```

Or trigger **Actions → CI/CD → Run workflow**.

---

## 6. Updates & maintenance

### View logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Backup Postgres

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres documind > ~/backup-$(date +%F).sql
```

### Restart

```bash
docker compose -f docker-compose.prod.yml restart
```

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | `ALLOWED_ORIGINS` must exactly match `https://app.yourdomain.me` |
| API hits localhost | Rebuild frontend after fixing `NEXT_PUBLIC_API_URL` |
| 401 from API | Production `CLERK_JWKS_URL` + `CLERK_SECRET_KEY` |
| OOM on 2 GB | Upgrade Droplet or disable community sync on boot |
| CD fails SSH | Check firewall port 22, secrets, `authorized_keys` |

---

## 8. Local vs production

| Setting | Local dev | Production |
|---------|-----------|------------|
| Compose file | `docker-compose.yml` | `docker-compose.prod.yml` |
| Celery/Redis | Optional (`USE_CELERY=true`) | Off (`USE_CELERY=false`) |
| Storage | Supabase or local | `USE_LOCAL_STORAGE=true` |
| Clerk keys | `pk_test_` / `sk_test_` | `pk_live_` / `sk_live_` |

See [README.md](./README.md) for local development.
