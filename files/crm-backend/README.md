# SalesPilot CRM — Backend

Node.js + Express + MongoDB + Redis + BullMQ + Socket.IO

## Stack

| Layer | Tech |
|---|---|
| API server | Node.js 20 + Express + TypeScript |
| Database | MongoDB (Atlas M0 free) via Mongoose |
| Cache / Queue | Redis (Upstash free) via ioredis |
| Job queue | BullMQ (SLA engine) |
| Real-time | Socket.IO + Redis adapter |
| Auth | JWT (access 15m + refresh 30d, rotation) |
| Email | Nodemailer (SMTP) + Gmail OAuth (send) |
| Validation | Zod (shared with frontend) |

## Structure

```
apps/
  api/          Express API server
  worker/       BullMQ SLA worker (separate process)
packages/
  shared/       Zod schemas + TypeScript types
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- MongoDB (Atlas M0 free at cloud.mongodb.com)
- Redis (Upstash free at console.upstash.com)

### 2. Setup
```bash
npm install
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your MongoDB + Redis URLs
```

### 3. Run locally
```bash
# Terminal 1 — API (port 3001)
npm run dev:api

# Terminal 2 — SLA Worker
npm run dev:worker
```

API health check: `GET http://localhost:3001/health`

### 4. First login
On first boot, a Super Admin is auto-created from `.env`:
- Go to `http://localhost:5173/admin`
- Sign in with `SUPER_ADMIN_EMAIL` + `SUPER_ADMIN_PASSWORD`
- Add a tenant → copy temp credentials
- Sign in at `/login` → reset password → you're in

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | Atlas M0 connection string |
| `REDIS_URL` | ✅ | Upstash Redis URL (`rediss://...`) |
| `JWT_ACCESS_SECRET` | ✅ | 32+ random chars |
| `JWT_REFRESH_SECRET` | ✅ | 32+ random chars (different) |
| `FRONTEND_URL` | ✅ | Exact frontend URL, no trailing slash |
| `SUPER_ADMIN_EMAIL` | ✅ | Platform admin email |
| `SUPER_ADMIN_PASSWORD` | ✅ | Platform admin password |
| `GOOGLE_CLIENT_ID` | Optional | For Google Sign-In |
| `GOOGLE_GMAIL_CLIENT_ID` | Optional | For Gmail send integration |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Optional | Gmail OAuth secret |
| `GOOGLE_GMAIL_REDIRECT_URI` | Optional | Must match Google Console |
| `MICROSOFT_CLIENT_ID` | Optional | For Microsoft Sign-In |
| `SMTP_HOST/PORT/USER/PASS` | Optional | For invite emails |

## Deploy to Render (free)

### API service
- Type: **Web Service**
- Build: `npm install && npm run build --workspace=apps/api`
- Start: `node apps/api/dist/index.js`
- Add all env vars in Render dashboard

### Worker service
- Type: **Background Worker**
- Build: `npm install && npm run build --workspace=apps/worker`
- Start: `node apps/worker/dist/index.js`
- Same env vars as API

## API Routes

```
POST   /auth/login                    Email + password login
POST   /auth/login/google             Google Sign-In
POST   /auth/login/microsoft          Microsoft Sign-In
POST   /auth/refresh                  Refresh token rotation
POST   /auth/logout                   Revoke refresh token
POST   /auth/reset-password           Force reset (mustResetPassword flow)
POST   /auth/accept-invite            Accept invite link

POST   /admin/login                   Super Admin login
GET    /admin/tenants                 List all tenants
POST   /admin/tenants                 Create tenant + first admin
PATCH  /admin/tenants/:id/suspend     Suspend tenant
PATCH  /admin/tenants/:id/reactivate  Reactivate tenant

GET    /users                         List team members
POST   /users/invite                  Invite user (sends email)
PATCH  /users/:id/role                Change role
DELETE /users/:id                     Remove user

GET    /contacts                      List + search contacts
POST   /contacts                      Create contact
GET    /contacts/:id                  Get contact
PATCH  /contacts/:id                  Update contact
DELETE /contacts/:id                  Soft delete
PATCH  /contacts/:id/next-action      Set follow-up

GET    /deals                         List deals
POST   /deals                         Create deal
GET    /deals/:id                     Get deal
PATCH  /deals/:id                     Update deal
PATCH  /deals/:id/stage               Move stage
POST   /deals/:id/close               Mark won/lost
PATCH  /deals/:id/next-action         Set follow-up
DELETE /deals/:id                     Soft delete

GET    /activities                    List activity feed
POST   /activities                    Create note/task/comment/email
POST   /activities/:id/convert-to-task Convert to task
PATCH  /activities/:id/complete       Complete task

GET    /dashboard/followups           Live SLA follow-ups
GET    /dashboard/summary             Dashboard KPIs

GET    /notifications                 List notifications
PATCH  /notifications/:id/read        Mark read
PATCH  /notifications/read-all        Mark all read

GET    /settings                      Get tenant settings
PATCH  /settings                      Update workspace
PATCH  /settings/stages               Update pipeline stages
PATCH  /settings/sla                  Update SLA config

GET    /analytics/pipeline            Pipeline metrics
GET    /analytics/reps                Per-rep performance
GET    /analytics/funnel              Stage funnel
GET    /analytics/forecast            Revenue forecast

GET    /email/accounts                List connected email accounts
GET    /email/connect/google          Get Gmail OAuth URL
POST   /email/connect/google/callback Exchange auth code
DELETE /email/accounts/:id            Disconnect account

GET    /documents                     List documents
POST   /documents                     Attach document
DELETE /documents/:id                 Remove document

GET    /health                        Health check
```

## Architecture

### Tenant isolation
Every query includes `tenantId` from JWT — never from request body.
`withTenant()` middleware validates JWT and attaches `req.auth`.

### SLA engine
When `nextAction.dueDate` is set on a deal:
1. BullMQ job scheduled with deterministic ID
2. Worker fires when delay elapses
3. Re-checks deal is still open
4. Creates Notification → pushes via Socket.IO

### Token rotation
- Access token: 15 minutes
- Refresh token: 30 days, rotated on every use
- Reuse detection: if old token replayed → entire family revoked

## License
MIT
