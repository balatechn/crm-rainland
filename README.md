# Rainland CRM

Modern, mobile-friendly CRM for **Rainland Auto Corp** (Montra & Isuzu Dealership Operations).
Manage leads, customer interactions, sales pipeline, quotations, test drives, bookings, deliveries,
WhatsApp communication, and branch performance.

## Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn-style UI (Vercel-ready)
- **Backend:** NestJS (REST + JWT + RBAC)
- **DB:** PostgreSQL (Prisma ORM)
- **Automation:** n8n workflow templates (`/automation`)
- **Integrations:** WhatsApp Business API, Email, Telephony, Google Maps

## Repo layout
```
apps/
  api/        # NestJS backend
  web/        # Next.js frontend
automation/   # n8n workflow JSON
docker-compose.yml
```

## Quick start

### 1. Prerequisites
- Node 20+
- Docker (for Postgres) OR a local Postgres 15+
- npm 10+

### 2. Boot Postgres
```bash
docker compose up -d db
```

### 3. Configure env
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 4. Install & migrate
```bash
npm install
npm run db:migrate
npm run db:seed
```

### 5. Run
```bash
npm run dev
# API  -> http://localhost:4000/api
# Web  -> http://localhost:3000
```

### Default logins (after seed)
| Role                  | Email                          | Password   |
|-----------------------|--------------------------------|------------|
| Admin                 | admin@rainland.in              | Admin@123  |
| CRM Manager           | crm@rainland.in                | Admin@123  |
| Call Center Exec      | callcenter@rainland.in         | Admin@123  |
| Sales Head            | saleshead@rainland.in          | Admin@123  |
| Branch Manager (BLR)  | bm.bangalore@rainland.in       | Admin@123  |
| Sales Executive (BLR) | se.bangalore@rainland.in       | Admin@123  |
| Team Leader (BLR)     | tl.bangalore@rainland.in       | Admin@123  |

## Modules implemented
- Auth (JWT) + RBAC + Audit Logs + Login History
- Master data: Branches, Vehicles (Montra + Isuzu), Lead Sources
- Lead Capture (WhatsApp / Walk-In / Website / etc.)
- Lead Assignment (pincode / city / branch / product rules)
- Sales Pipeline (13 stages)
- Test Drives, Quotations (PDF), Bookings, Deliveries
- WhatsApp messages log + broadcasts
- Dashboards (Head Office + Branch)
- Reports (Lead / Sales / WhatsApp)
- Mobile responsive, click-to-chat, GPS visit tracking field

## Deployment
- **Web** → Vercel (`apps/web`)
- **API** → VPS / Coolify (Dockerfile in `apps/api`)
- **DB**  → managed PostgreSQL
