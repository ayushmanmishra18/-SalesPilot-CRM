# CRM App — Developer Guide

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- MongoDB (Atlas M0 free) or local
- Redis (Upstash free) or local Memurai (Windows)

### 1. Backend
```bash
cd crm-backend
cp apps/api/.env.example apps/api/.env
# Fill in MONGODB_URI and REDIS_URL
npm install

# Terminal 1 — API server
npm run dev:api

# Terminal 2 — SLA worker
npm run dev:worker
```

API runs at `http://localhost:3001`. On first boot, a Super Admin is auto-seeded from `.env`.

### 2. Frontend
```bash
cd crm-frontend
cp apps/web/.env.example apps/web/.env   # set VITE_API_URL=http://localhost:3001
npm install
npm run dev --workspace=apps/web
```

Frontend runs at `http://localhost:5173`.

### 3. First login flow
1. Go to `http://localhost:5173/admin`
2. Log in with `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD` from `.env`
3. Click **Add tenant** → fill company name + admin email
4. Copy the temp credentials shown once
5. Go to `http://localhost:5173/login`, sign in with those credentials
6. You'll be forced to set a new password
7. You're in the workspace

---

## Project Structure

```
crm-backend/
├── apps/api/src/
│   ├── config/         env vars
│   ├── lib/            logger, db, redis, jwt, sla, slaQueue, mailer, notify
│   ├── middleware/     requestId, auth (withTenant+requireRole), adminAuth, idempotency, rateLimit, validate
│   ├── models/         Tenant, User, SuperAdmin, RefreshToken, Contact, Deal, Activity, Notification, IdempotencyKey, EmailAccount, Document
│   ├── modules/        one folder per feature: auth, admin, users, contacts, deals, activities, dashboard, notifications, settings, analytics, email, documents
│   ├── app.ts          Express factory
│   ├── socket.ts       Socket.IO setup
│   ├── seed.ts         SuperAdmin auto-seed
│   └── index.ts        entry point
├── apps/worker/src/
│   └── index.ts        BullMQ consumer — SLA overdue + daily digest
└── packages/shared/src/
    ├── constants.ts    roles, error codes, SLA statuses, default stages
    ├── types.ts        TypeScript interfaces for all entities
    └── schemas/        Zod validation schemas (shared with frontend)

crm-frontend/
├── apps/web/src/
│   ├── api/            typed API client (axios)
│   ├── components/
│   │   ├── layout/     AppShell (sidebar + topbar)
│   │   ├── ui/         Button, Input, Select, Card, Modal, StatCard, Tabs, Spinner, SlaPill, Badge...
│   │   ├── activity/   ActivityComposer, ActivityFeed
│   │   └── deal/       NextActionWidget, DocumentsPanel
│   ├── hooks/          useSocket
│   ├── pages/          one folder per route
│   ├── store/          auth (Zustand), theme (Zustand)
│   └── utils/          sla.ts (computeSlaStatus, formatCurrency, formatDate)
```

---

## Key Architecture Decisions

### Auth flow
1. Frontend sends credentials → Backend returns `accessToken` (15min) + `refreshToken` (30d)
2. Axios interceptor attaches Bearer token on every request
3. On 401, interceptor auto-calls `/auth/refresh` with the refresh token
4. Refresh token rotation — each refresh issues a new pair, old token is revoked
5. Reuse detection — if an old token is replayed, the entire family is revoked (security)

### Tenant isolation
- Every Mongoose query includes `tenantId: req.auth._tenantId`
- `tenantId` is **always** taken from the JWT payload, never from the request body
- `withTenant()` middleware validates the JWT and attaches `req.auth`
- Super Admin routes use a completely separate middleware chain (`requireSuperAdmin`)

### SLA — always computed live
```ts
// lib/sla.ts
computeSlaStatus(nextAction, slaConfig)
// Returns: 'overdue' | 'due_today' | 'upcoming' | 'on_track' | 'unscheduled'
// Called at read time on every deal/contact — never stored, never cached
```

### BullMQ SLA jobs
When a deal's `nextAction.dueDate` is set:
1. API calls `getSlaQueue().add('sla:overdue', data, { jobId: slaJobId(dealId), delay: ms until due })`
2. Job ID is deterministic (`sla:overdue:${dealId}`) — scheduling twice is idempotent
3. Worker fires when delay elapses → re-checks deal is still open → creates Notification

### Idempotency
Every POST that creates a resource requires `Idempotency-Key: <uuid>` header.
- First request: processed, response stored
- Duplicate request (same key + same body): original response returned
- Duplicate with different body: 409 Conflict

### Socket.IO rooms
```
tenant:{tenantId}           — all users in a tenant (deal:moved broadcasts)
tenant:{tenantId}:user:{id} — per-user (notification:new)
record:{type}:{publicId}    — deal/contact detail page viewers (activity:new)
```

---

## Adding a New Feature (checklist)

### Backend
1. Add/update Mongoose model if needed
2. Add Zod schema to `packages/shared/src/schemas/`
3. Create `modules/feature/feature.router.ts`
4. In every route: `withTenant` + `requireActiveTenant` + `requireRole` + `idempotency` on POSTs
5. Every query: `tenantId: req.auth._tenantId` — no exceptions
6. Mount in `app.ts`
7. Add to API surface in this doc

### Frontend
1. Add typed API method to `src/api/index.ts`
2. Create page in `src/pages/feature/FeaturePage.tsx`
3. Add to router in `App.tsx`
4. Add nav item to `AppShell.tsx` if needed

---

## Deployment

### Render (API + Worker)

**API service:**
- Type: Web Service
- Build: `npm install && npm run build --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Env vars: copy from `.env.example`, fill in real values

**Worker service:**
- Type: Background Worker
- Build: `npm install && npm run build --workspace=apps/worker`
- Start: `node apps/worker/dist/index.js`
- Same env vars as API

### Vercel (Frontend)
- Root: `apps/web`
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_API_URL=https://your-api.onrender.com`
- `VITE_GOOGLE_CLIENT_ID` (for Google sign-in)

### MongoDB Atlas
- Free M0 cluster
- Network Access: allow `0.0.0.0/0` for Render (dynamic IPs)
- Create DB user → copy connection string → set as `MONGODB_URI`

### Upstash Redis
- Free database
- Copy **ioredis** format URL (starts with `rediss://`)
- Set as `REDIS_URL`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis URL (ioredis format, `rediss://` for TLS) |
| `JWT_ACCESS_SECRET` | ✅ | 32+ char random string |
| `JWT_REFRESH_SECRET` | ✅ | 32+ char random string, different from access |
| `FRONTEND_URL` | ✅ | Exact frontend origin (no trailing slash) |
| `SUPER_ADMIN_EMAIL` | ✅ | First super admin email |
| `SUPER_ADMIN_PASSWORD` | ✅ | First super admin password |
| `GOOGLE_CLIENT_ID` | Optional | For "Sign in with Google" |
| `GOOGLE_GMAIL_CLIENT_ID` | Optional | For Gmail send integration |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Optional | Gmail OAuth secret |
| `GOOGLE_GMAIL_REDIRECT_URI` | Optional | Must match Google Console (`/settings`) |
| `MICROSOFT_CLIENT_ID` | Optional | For "Sign in with Microsoft" |
| `SMTP_HOST/PORT/USER/PASS` | Optional | For invite emails |

---

## Roles

| Role | Create/edit | Admin actions | Analytics |
|---|---|---|---|
| Admin | ✅ | ✅ | Full (incl. team KPIs) |
| Member | ✅ | ❌ | Pipeline + funnel only |
| Viewer | ❌ (read only) | ❌ | Pipeline + funnel only |
| Super Admin | N/A — never in tenant | N/A | N/A |

---

## Analytics Endpoints

| Endpoint | Returns |
|---|---|
| `GET /analytics/pipeline` | openValue, wonThisMonth, winRate, dealsByStage, slaBreakdown |
| `GET /analytics/reps` | per-user: openCount, openValue, wonThisMonth, winRate, overdueCount |
| `GET /analytics/funnel` | stage-by-stage count + value |
| `GET /analytics/forecast` | committed, bestCase, openValue, wonLastMonth for MoM comparison |

---

## Troubleshooting

**"Cannot connect to MongoDB"**  
→ Check Atlas Network Access — Render has dynamic IPs, use `0.0.0.0/0`

**"Redis connection failed"**  
→ Use `rediss://` (double-s) for Upstash — they require TLS

**Socket.IO not connecting**  
→ `FRONTEND_URL` in `.env` must exactly match the deployed frontend URL

**Gmail OAuth "No refresh token received"**  
→ In Google Cloud Console, revoke app access, then re-connect — consent must be fresh for refresh token

**SLA jobs not firing**  
→ Verify worker is running (`npm run dev:worker`); check Upstash queue has jobs; confirm `REDIS_URL` is same as API
