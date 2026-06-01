# Rainland CRM — Deployment

Repo: https://github.com/balatechn/crm-rainland

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────────┐
│   Vercel (frontend) │  HTTPS │  Coolify  (187.127.134.246)      │
│   apps/web (Next.js)│ ─────► │   ┌────────────────────────────┐ │
└─────────────────────┘        │   │ api  (NestJS, port 4000)   │ │
                               │   │ db   (Postgres 15)         │ │
                               │   │ n8n  (workflows)           │ │
                               │   │ evolution-api (WhatsApp)   │ │
                               │   └────────────────────────────┘ │
                               └──────────────────────────────────┘
```

---

## 1. Backend stack on Coolify

1. In Coolify (http://187.127.134.246:8000) → **New Resource → Docker Compose**.
2. Source: **Git repository** → `https://github.com/balatechn/crm-rainland` → branch `main`.
3. Compose file path: `docker-compose.coolify.yml`.
4. **Environment variables** (set in Coolify UI, not in git):

   | Key | Example |
   |---|---|
   | `POSTGRES_USER` | `rainland` |
   | `POSTGRES_PASSWORD` | *(generate strong)* |
   | `POSTGRES_DB` | `rainland_crm` |
   | `JWT_SECRET` | *(32+ char random)* |
   | `WEB_ORIGIN` | `https://crm-rainland.vercel.app` |
   | `N8N_HOST` | `n8n.your-domain.com` |
   | `N8N_USER` | `admin` |
   | `N8N_PASSWORD` | *(generate strong)* |
   | `EVOLUTION_API_KEY` | *(generate strong)* |
   | `WHATSAPP_INSTANCE` | `rainland` |
   | `RAINLAND_SERVICE_TOKEN` | *(JWT from admin login, fill in after first deploy)* |

5. In Coolify, expose these services with public domains:
   - `api` → e.g. `api.your-domain.com` (port 4000)
   - `n8n` → e.g. `n8n.your-domain.com` (port 5678)
   - `evolution-api` → e.g. `wa.your-domain.com` (port 8080) — keep behind the API key.
6. Deploy. On first boot, `prisma migrate deploy` runs automatically.
7. Seed the DB once: open the API container terminal in Coolify and run
   `npx prisma db seed`. Default login: `admin@rainland.in / Admin@123` — **change immediately**.

### Evolution API — create the WhatsApp instance

```bash
curl -X POST https://wa.your-domain.com/instance/create \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"rainland","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
```

Then GET `/instance/connect/rainland` → scan QR with the dealership phone.

---

## 2. Frontend on Vercel

1. https://vercel.com/new → import `balatechn/crm-rainland`.
2. **Root Directory:** `apps/web`
3. Framework preset: **Next.js** (auto-detected).
4. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` = `https://api.your-domain.com/api`
5. Deploy. Vercel will give you `crm-rainland.vercel.app` (add custom domain later).
6. After it's live, update `WEB_ORIGIN` in Coolify to the Vercel URL and redeploy the API (for CORS).

### Or via CLI

```bash
cd apps/web
npx vercel link
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel --prod
```

---

## 3. Wire n8n flows

After n8n is up:
1. Log in at `https://n8n.your-domain.com` (basic auth user/pass from env).
2. Import the JSON files from `automation/n8n/` (Import from File).
3. In each workflow's HTTP Request node, set the base URL to `http://api:4000/api`
   and the bearer token to `{{ $env.RAINLAND_TOKEN }}`.
4. Activate.

---

## 4. Local development (unchanged)

```bash
docker compose up -d db
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

App: http://localhost:3000 — API: http://localhost:4000/api
