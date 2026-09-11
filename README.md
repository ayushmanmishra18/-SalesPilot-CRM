<div align="center">

<br/>

<img src="https://img.shields.io/badge/SalesPilot-CRM-10B981?style=for-the-badge&logoColor=white" alt="SalesPilot CRM"/>

# SalesPilot CRM

**A production-grade, multi-tenant B2B sales CRM built from scratch.**  
Deal pipeline · SLA engine · Real-time collaboration · Analytics · Role-based access

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat-square&logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socketdotio&logoColor=white)

<br/>

</div>

---

## What is this?

SalesPilot is a full-stack, multi-tenant CRM comparable to Pipedrive and HubSpot at the core — built on three features that everything else exists to support:

| Feature | What it does |
|---|---|
| **F1 — Deal Pipeline** | Turn contacts into revenue through configurable Kanban stages |
| **F2 — Next Action SLA** | Make it structurally impossible for a deal to go cold |
| **F3 — Unified Collaboration** | Notes, tasks, comments, and email in one activity feed per deal |

**The test:** could a small sales team run their entire week inside this app without a spreadsheet? Yes.

---

## Screenshots

> Login · Dashboard · Pipeline · Deal Detail · Analytics

```
┌─────────────────────────────────────────────────────────────┐
│  Login                        │  Dashboard                  │
│  ─ Brand panel + feature list │  ─ 4 KPI stat cards         │
│  ─ Google + Microsoft SSO     │  ─ Live follow-up list      │
│  ─ Email + password           │  ─ Pipeline bar chart       │
├─────────────────────────────────────────────────────────────┤
│  Pipeline (Kanban)            │  Deal Detail                │
│  ─ Drag between stages        │  ─ Stage breadcrumb         │
│  ─ Won/Lost inline            │  ─ Next action widget       │
│  ─ Board + list toggle        │  ─ Live activity feed       │
├─────────────────────────────────────────────────────────────┤
│  Analytics                                                  │
│  ─ Pipeline · Funnel · Forecast · Team KPIs (4 tabs)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (`apps/web`)
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 4 + CSS variables (dark/light theme) |
| State | Zustand |
| Data fetching | TanStack Query v5 |
| Real-time | Socket.IO client |
| HTTP | Axios (auto-refresh interceptor) |
| Routing | React Router v7 |
| Icons | Lucide React |
| Validation | Zod (shared with backend) |

### Backend (`apps/api`)
| | |
|---|---|
| Runtime | Node.js 20 + Express + TypeScript |
| Database | MongoDB 7 via Mongoose |
| Cache / Queue | Redis (ioredis) |
| Job queue | BullMQ (SLA engine) |
| Real-time | Socket.IO + Redis adapter |
| Auth | JWT (access 15m + refresh 30d, rotation + reuse detection) |
| Validation | Zod |
| Email | Nodemailer (SMTP) + Gmail OAuth |
| Logging | Winston (structured JSON + requestId) |

### Infrastructure
| | |
|---|---|
| Database | MongoDB Atlas M0 (free) |
| Redis | Upstash (free) |
| API + Worker | Render (free tier / $7/mo always-on) |
| Frontend | Vercel (free) |

---

## Repository Structure

```
crm/
├── crm-frontend/                   # React frontend
│   ├── README.md
│   ├── package.json                # npm workspaces root
│   ├── apps/
│   │   └── web/                    # React + Vite app
│   │       ├── .env.example
│   │       └── src/
│   │           ├── api/            # Typed API client
│   │           ├── components/
│   │           │   ├── layout/     # AppShell (sidebar + topbar)
│   │           │   ├── ui/         # Button, Input, Card, Modal, Tabs...
│   │           │   ├── activity/   # ActivityComposer, ActivityFeed
│   │           │   └── deal/       # NextActionWidget, DocumentsPanel
│   │           ├── hooks/          # useSocket
│   │           ├── pages/          # One folder per route
│   │           ├── store/          # auth.ts, theme.ts (Zustand)
│   │           └── utils/          # sla.ts
│   └── packages/
│       └── shared/                 # Zod schemas + TypeScript types
│
└── crm-backend/                    # Node.js backend
    ├── README.md
    ├── RUNBOOK.md                  # Backup / restore / incident guide
    ├── docker-compose.yml          # Local MongoDB + Redis
    ├── package.json                # npm workspaces root
    ├── apps/
    │   ├── api/                    # Express API server
    │   │   ├── .env.example
    │   │   └── src/
    │   │       ├── config/         # env vars
    │   │       ├── lib/            # logger, db, redis, jwt, sla, mailer, notify
    │   │       ├── middleware/     # auth, idempotency, rateLimit, validate
    │   │       ├── models/         # 11 Mongoose models
    │   │       └── modules/        # auth, admin, users, contacts, deals,
    │   │                           # activities, dashboard, notifications,
    │   │                           # settings, analytics, email, documents
    │   └── worker/                 # BullMQ SLA worker (separate process)
    └── packages/
        └── shared/                 # Zod schemas + TypeScript types
```

---

## Features

### Core CRM
- ✅ **Deal pipeline** — Kanban board with drag-and-drop, list view toggle, configurable stages
- ✅ **Stage history** — every move timestamped with who moved it
- ✅ **Won / Lost flow** — confirm won, require loss reason
- ✅ **Contact management** — name, email, phone, company, job title, lead status, source
- ✅ **Customer 360 view** — contact profile + linked deals + full activity timeline
- ✅ **Lead management** — lead status (new → contacted → qualified → converted) + source tracking

### SLA Engine (F2)
- ✅ **Next action on every deal** — text + due date, set inline
- ✅ **SLA computed live** — never cached, never drifts. Five states: Overdue / Due today / Upcoming / On track / Unscheduled
- ✅ **BullMQ jobs** — scheduled when next action is set, cancelled when deal closes
- ✅ **Dashboard follow-ups panel** — sorted by urgency, links back to deal
- ✅ **SLA alerts** — worker fires notification when deal goes overdue
- ✅ **Configurable thresholds** — at-risk window days, unscheduled grace hours per tenant

### Collaboration (F3)
- ✅ **Unified activity feed** — notes, tasks, comments, emails in one reverse-chronological feed
- ✅ **Convert to task** — any note or comment → task with one click
- ✅ **@mentions** — notifies the mentioned user instantly
- ✅ **Task management** — assignee, due date, complete checkbox, SLA status on tasks
- ✅ **Gmail integration** — connect Gmail via OAuth, send emails from the CRM, auto-logged to feed
- ✅ **Document attachments** — attach files to deals and contacts

### Analytics
- ✅ **Pipeline tab** — open value, won this month, win rate, MoM comparison, stage bar chart, SLA health breakdown
- ✅ **Funnel tab** — stage-by-stage conversion funnel with progress bars
- ✅ **Forecast tab** — committed / best case / full pipeline scenarios, at-risk alert
- ✅ **Team KPIs tab** — per-rep leaderboard with pipeline bar, won value, overdue count, win rate (admin only)

### Access & Security
- ✅ **Multi-tenant** — every query scoped to tenant from JWT, never from request body
- ✅ **Three roles** — Admin / Member / Viewer, enforced server-side on every route
- ✅ **Super Admin** — separate identity, provisions tenants, never touches tenant data
- ✅ **Google + Microsoft Sign-In** — OAuth, email-matched to invited user
- ✅ **Refresh token rotation** — reuse detection, family revocation
- ✅ **Idempotency** — every POST requires Idempotency-Key, duplicate requests safely replayed
- ✅ **Rate limiting** — IP-keyed on auth, user+tenant-keyed on API
- ✅ **Structured logging** — Winston JSON with requestId on every request
- ✅ **Helmet + CORS** — security headers, frontend-only origin

### Real-time
- ✅ **Socket.IO** — JWT auth handshake, Redis adapter for multi-instance
- ✅ **Live activity feed** — new note/task/comment appears instantly on the deal page
- ✅ **Live board updates** — deal moved in one tab, everyone else's board updates
- ✅ **Live notifications** — bell icon updates in real-time, toast on @mention

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas M0 account (free) → [cloud.mongodb.com](https://cloud.mongodb.com)
- Upstash Redis account (free) → [console.upstash.com](https://console.upstash.com)

### 1. Clone
```bash
git clone https://github.com/your-username/salespilot-crm.git
cd salespilot-crm
```

### 2. Backend setup
```bash
cd crm-backend
npm install
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm
REDIS_URL=rediss://default:token@endpoint.upstash.io:6380
JWT_ACCESS_SECRET=your-32-char-random-secret
JWT_REFRESH_SECRET=your-other-32-char-random-secret
FRONTEND_URL=http://localhost:5173
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=YourSecurePassword123!
```

```bash
# Terminal 1 — API server
npm run dev:api

# Terminal 2 — SLA worker
npm run dev:worker
```

### 3. Frontend setup
```bash
cd crm-frontend
npm install
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:
```env
VITE_API_URL=http://localhost:3001
```

```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. First login
1. Go to `http://localhost:5173/admin`
2. Sign in with your `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD`
3. Click **Add tenant** → fill company name + admin email
4. Copy the temporary credentials shown **once**
5. Go to `http://localhost:5173/login`
6. Sign in with those credentials → reset password → you're in

---

## Roles & Permissions

| Action | Admin | Member | Viewer |
|---|---|---|---|
| View deals, contacts, pipeline | ✅ | ✅ | ✅ |
| Create / edit deals and contacts | ✅ | ✅ | ❌ |
| Set next action / follow-up | ✅ | ✅ | ❌ |
| Add notes, tasks, comments | ✅ | ✅ | ❌ |
| Close deals (won / lost) | ✅ | ✅ | ❌ |
| Configure pipeline stages | ✅ | ❌ | ❌ |
| Invite / remove team members | ✅ | ❌ | ❌ |
| Change team member roles | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ (no team tab) | ✅ (no team tab) |
| View team KPIs | ✅ | ❌ | ❌ |
| Configure workspace settings | ✅ | ❌ | ❌ |

> **Super Admin** is a completely separate identity — not a role inside the CRM. It can only provision/suspend tenants and never accesses tenant data.

---

## Deploy to Production (Free Tier)

### Backend → Render

**API Service:**
- Type: Web Service
- Build: `npm install && npm run build --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Add all env vars from `.env.example`

**Worker Service:**
- Type: Background Worker
- Build: `npm install && npm run build --workspace=apps/worker`
- Start: `node apps/worker/dist/index.js`
- Same env vars as API

> **Note:** Render free tier spins down after 15 min idle. Upgrade to Starter ($7/mo) for always-on.

### Frontend → Vercel
- Root directory: `apps/web`
- Build command: `npm run build`
- Output directory: `dist`
- Add env vars: `VITE_API_URL=https://your-api.onrender.com`

### Database + Cache
- **MongoDB Atlas M0** — free, 512MB, no credit card
- **Upstash Redis** — free, 10k commands/day, supports BullMQ + Socket.IO adapter

---

## Environment Variables Reference

### Backend (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas connection string |
| `REDIS_URL` | ✅ | Upstash URL (`rediss://...` with TLS) |
| `JWT_ACCESS_SECRET` | ✅ | 32+ random chars |
| `JWT_REFRESH_SECRET` | ✅ | 32+ random chars (different from access) |
| `FRONTEND_URL` | ✅ | Exact frontend origin, no trailing slash |
| `SUPER_ADMIN_EMAIL` | ✅ | Platform admin email (auto-seeded on boot) |
| `SUPER_ADMIN_PASSWORD` | ✅ | Platform admin password |
| `GOOGLE_CLIENT_ID` | Optional | Google Sign-In |
| `GOOGLE_GMAIL_CLIENT_ID` | Optional | Gmail send OAuth |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Optional | Gmail OAuth secret |
| `GOOGLE_GMAIL_REDIRECT_URI` | Optional | Must match Google Console |
| `MICROSOFT_CLIENT_ID` | Optional | Microsoft Sign-In |
| `SMTP_HOST` | Optional | SMTP host for invite emails |
| `SMTP_PORT` | Optional | SMTP port (587) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password / app password |
| `EMAIL_FROM` | Optional | Sender name + email |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend URL |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google Sign-In client ID |
| `VITE_MICROSOFT_CLIENT_ID` | Optional | Microsoft Sign-In client ID |

---

## Architecture Decisions

| Decision | Reason |
|---|---|
| Modular monolith, not microservices | Boundaries matter more than deployment topology at this scale |
| Shared DB with `tenantId` discriminator | Only viable model on free infra; enforced by middleware + indexes |
| SLA computed live, never cached | A cached field drifts by construction. Live computation cannot. |
| BullMQ + Redis for SLA jobs | The one workload that genuinely needs durable, precisely-timed execution |
| Idempotency-Key on every create | Double-clicks and retries must never duplicate records |
| JWT rotation with family tracking | Reuse detection — if old token replayed, entire session family is revoked |
| Global unique email on User | Both login paths need to resolve an account before knowing the tenant |
| No public self-signup | Would let anyone claim any email permanently given global uniqueness |
| UTC for all timestamps | Local time as source of truth breaks the moment users span timezones |
| Rate limiting in Phase 1 | Login without rate limiting is an immediate brute-force risk |

---

## Data Model

```
Tenant          — workspace config, stages, slaConfig, currency, timezone
User            — globally unique email, role, authProvider, mustResetPassword
SuperAdmin      — separate identity, never a User
RefreshToken    — rotation chain, family-based reuse detection, TTL 30d
Contact         — name, company, leadStatus, source, nextAction, soft-delete
Deal            — title, value, stage, stageHistory, nextAction, status, owner
Activity        — type: note|task|comment|email, unified feed, convertedFrom/To
Notification    — type, message, relatedTo, read, TTL 90d
IdempotencyKey  — key, requestHash, stored response, TTL 24h
EmailAccount    — Gmail/Outlook OAuth refresh token, status
Document        — name, url, mimeType, relatedTo
```

---

## What's deferred (v2+)

- Two-way email sync (inbound)
- Dedicated Account entity (company record)
- Custom fields on contacts/deals
- Workflow automation engine
- Enterprise SSO / SAML
- Multi-pipeline support
- Team chat (DMs + channels)
- CSV import/export
- Public API
- Audit log
- Multi-currency

---

## License

MIT — use it, fork it, build on it.

---

<div align="center">

Built with ❤️ using React · Node.js · MongoDB · Redis · Socket.IO

</div>
