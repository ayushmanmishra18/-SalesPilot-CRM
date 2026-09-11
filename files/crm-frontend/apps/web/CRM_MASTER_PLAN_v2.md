# CRM App — Master Plan v2.0

**Version:** 2.0  
**Updated:** 2026-09  
**Status:** v1 Frontend complete · Backend complete · Analytics upgraded

---

## What changed from v1.4 → v2.0

| Area | Change |
|---|---|
| Analytics | Added Funnel, Forecast, and Team KPI tabs with real data |
| Contacts | Added `leadStatus` and `source` fields for lead management |
| UI | Full design pass — spacing, forms, select styling, cards, modals |
| Backend | Added `/analytics/funnel`, `/analytics/forecast` endpoints |
| Contact model | `leadStatus`, `source` fields + indexes |
| Settings | Tabbed layout: Workspace / Pipeline / SLA / Email |
| Users | Role change inline, invite link copy, cleaner table |

---

## Implementation Status

### ✅ Done — Frontend (apps/web)

| Feature | Status | Notes |
|---|---|---|
| Login (email + Google + Microsoft) | ✅ | |
| Accept invite + force password reset | ✅ | |
| Super Admin panel (/admin) | ✅ | Separate auth chain |
| Dashboard — KPIs, followups, pipeline chart | ✅ | 4-stat row, live SLA |
| Contacts — list, search, create, delete | ✅ | + leadStatus + source filters |
| Contact detail — 360 view, activity, deals | ✅ | |
| Pipeline — kanban, drag, won/lost | ✅ | |
| Deal detail — nextAction, stageHistory, activity feed | ✅ | |
| Activity feed — note/task/comment/email | ✅ | |
| Convert note/comment → task | ✅ | |
| @mention in comments | ✅ | |
| Gmail send from CRM | ✅ | OAuth connect in Settings |
| Analytics — Pipeline tab | ✅ | Stage bars, SLA health |
| Analytics — Funnel tab | ✅ | Stage funnel + conversion metrics |
| Analytics — Forecast tab | ✅ | Committed / Best case / Pipeline |
| Analytics — Team KPIs tab | ✅ | Per-rep leaderboard (admin only) |
| Notifications bell — real-time | ✅ | Socket.IO push |
| Settings — Workspace, Pipeline, SLA, Email tabs | ✅ | |
| Users — invite, role change, remove | ✅ | |
| Dark / Light theme | ✅ | |
| Responsive mobile layout | ✅ | |

### ✅ Done — Backend (apps/api)

| Feature | Status |
|---|---|
| Auth (email + Google + Microsoft) | ✅ |
| JWT rotation with reuse detection | ✅ |
| Super Admin (separate identity + routes) | ✅ |
| withTenant() + requireRole() middleware | ✅ |
| Idempotency-Key on all POSTs | ✅ |
| Rate limiting (IP + user+tenant keyed) | ✅ |
| Structured logging + requestId | ✅ |
| All 9 Mongoose models + TTL indexes | ✅ |
| Contacts CRUD + leadStatus + source | ✅ |
| Deals CRUD + stage move + close | ✅ |
| SLA computed live (never cached) | ✅ |
| BullMQ SLA jobs scheduled on nextAction | ✅ |
| Activities (note/task/comment/email) | ✅ |
| Gmail send via OAuth | ✅ |
| Dashboard (followups + summary) | ✅ |
| Notifications (create + push via socket) | ✅ |
| Settings (tenant + stages + SLA) | ✅ |
| Analytics (pipeline + reps + funnel + forecast) | ✅ |
| Socket.IO (JWT handshake + Redis adapter) | ✅ |
| Documents (list + create + delete) | ✅ |

### ✅ Done — Worker (apps/worker)

| Feature | Status |
|---|---|
| BullMQ consumer — sla:overdue → notification | ✅ |
| Daily digest handler | ✅ |
| Duplicate notification guard (24h window) | ✅ |

---

## Feature Gap Analysis vs Enterprise CRM

### What we have vs full CRM feature set

| Feature | Have | Notes |
|---|---|---|
| Contact management | ✅ Full | name, email, phone, company, jobTitle, notes, leadStatus, source |
| Account management | ⚠️ Partial | Company field only — no dedicated Account entity |
| Customer 360 view | ✅ | ContactDetailPage: profile + deals + activity feed |
| Lead management | ✅ | leadStatus (new→converted), source tracking, filters |
| Opportunity / Deal management | ✅ Full | CRUD, kanban, stage history, value, close |
| Pipeline management | ✅ Full | Configurable stages, kanban + list, drag |
| Next Action / Follow-up SLA | ✅ Full | Live SLA, BullMQ jobs, dashboard panel |
| Sales automation (SLA alerts) | ✅ | BullMQ worker fires notifications on overdue |
| Workflow automation | ❌ Deferred | Rule-based automation engine — v2 |
| Reporting / Analytics dashboards | ✅ Good | Pipeline, Funnel, Forecast, Team KPIs |
| Team KPIs | ✅ | Per-rep won, open, overdue, win rate |
| Task management | ✅ | Unified activity feed — tasks with due dates, assignees |
| Document management | ✅ Basic | URL-based attach to deal/contact |
| Email from app | ✅ | Gmail OAuth, compose-and-send, auto-logged |
| Email two-way sync | ❌ Deferred | Inbound sync — v2 |
| Customization (stages, SLA, currency) | ✅ | Admin settings |
| Custom fields | ❌ Deferred | v2 |
| Role-based access | ✅ Full | Admin / Member / Viewer, server-enforced |
| Tenant isolation | ✅ Full | Separate data, JWT-derived identity |
| Data security | ✅ | bcrypt, JWT rotation, rate limiting, helmet, CORS |
| No-code pipeline config | ✅ | Drag-rename stages in Settings |
| Real-time collaboration | ✅ | Socket.IO — live feed, board updates |
| Notifications | ✅ | Bell icon, push via socket, SLA alerts |
| Mobile responsive | ✅ | Sidebar collapses, stacked layouts |

---

## Data Model (current)

```
Tenant          — workspace config, stages, slaConfig, currency, timezone
User            — globally unique email, role, authProvider, mustResetPassword
SuperAdmin      — separate identity, never a User
RefreshToken    — rotation chain, family-based reuse detection, TTL 30d
Contact         — name, company, leadStatus, source, nextAction, soft-delete
Deal            — title, value, stage, stageHistory, nextAction, status, owner
Activity        — type: note|task|comment|email, unified feed, convertedFrom/To
Notification    — type, message, relatedTo, read, TTL 90d
IdempotencyKey  — key, requestHash, response, TTL 24h
EmailAccount    — provider: google|microsoft, oauthRefreshToken, status
Document        — name, url, mimeType, relatedTo
```

---

## API Surface (complete)

```
Auth        POST /auth/login · /login/google · /login/microsoft
            POST /auth/refresh · /auth/logout
            POST /auth/reset-password · /auth/accept-invite
Admin       POST /admin/login
            GET  /admin/tenants · POST /admin/tenants
            PATCH /admin/tenants/:id/suspend · /reactivate
Users       GET /users · POST /users/invite
            PATCH /users/:id/role · DELETE /users/:id
Contacts    GET /contacts · POST /contacts
            GET/PATCH/DELETE /contacts/:id
            PATCH /contacts/:id/next-action
Deals       GET /deals · POST /deals
            GET/PATCH/DELETE /deals/:id
            PATCH /deals/:id/stage · /next-action
            POST /deals/:id/close
Activities  GET /activities?relatedTo=type:id
            POST /activities
            POST /activities/:id/convert-to-task
            PATCH /activities/:id/complete
Dashboard   GET /dashboard/followups · /dashboard/summary
Notifications GET /notifications
            PATCH /notifications/:id/read · /notifications/read-all
Settings    GET/PATCH /settings
            PATCH /settings/stages · /settings/sla
Analytics   GET /analytics/pipeline · /analytics/reps
            GET /analytics/funnel · /analytics/forecast
Email       GET /email/accounts · /email/connect/google
            POST /email/connect/google/callback · /email/send
            DELETE /email/accounts/:id
Documents   GET /documents · POST /documents · DELETE /documents/:id
Socket.IO   join tenant room on connect (auto)
            join personal room on connect (auto)
            emit join:record / leave:record for deal/contact pages
            events: activity:new · deal:moved · notification:new
```

---

## Roles Summary

| Role | Who | Can do |
|---|---|---|
| **Admin** | Manager | Everything — configure, invite, full CRUD, analytics |
| **Member** | Sales rep | Create/edit deals, contacts, activities, own follow-ups |
| **Viewer** | Stakeholder | Read-only — blocked server-side on mutations |
| **Super Admin** | Platform operator | Provision/suspend tenants only — never touches tenant data |

---

## Hosting (free tier)

| Service | Used for | Free limit |
|---|---|---|
| Atlas M0 | MongoDB | 512MB |
| Upstash | Redis (BullMQ + Socket.IO) | 10k commands/day |
| Vercel | Frontend | Unlimited |
| Render | API + Worker | Spins down after 15min idle (upgrade $7/mo for always-on) |

---

## Deferred (v2)

- Two-way email sync (inbound)
- Account entity (dedicated company record)
- Custom fields on contacts/deals
- Workflow automation engine (rule-based)
- Per-tenant timezone-aware SLA scheduling
- Enterprise SSO / SAML
- Multi-pipeline support
- Team chat (F4 — full spec in original plan §19.1)
- Import/export (CSV)
- Public API
- Audit log
- Multi-currency
