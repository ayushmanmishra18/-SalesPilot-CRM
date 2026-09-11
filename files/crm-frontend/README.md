# SalesPilot CRM — Frontend

React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand + TanStack Query + Socket.IO

## Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 4 + CSS variables |
| State | Zustand (auth + theme) |
| Data fetching | TanStack Query v5 |
| Real-time | Socket.IO client |
| HTTP | Axios (with auto-refresh interceptor) |
| Validation | Zod (shared with backend) |
| Icons | Lucide React |
| Routing | React Router v7 |

## Structure

```
apps/web/src/
  api/              Typed API client (all endpoints)
  components/
    layout/         AppShell (sidebar + topbar)
    ui/             Button, Input, Card, Modal, Tabs, StatCard...
    activity/       ActivityComposer, ActivityFeed
    deal/           NextActionWidget, DocumentsPanel
  hooks/            useSocket
  pages/
    auth/           Login, ResetPassword, AcceptInvite
    admin/          Super Admin console
    dashboard/      Dashboard (KPIs + follow-ups)
    contacts/       Contacts list + detail (360 view)
    pipeline/       Kanban board + list view
    deals/          Deal detail
    users/          Team management
    analytics/      Pipeline / Funnel / Forecast / Team KPIs
    settings/       Workspace / Pipeline / SLA / Email
  store/            auth.ts, theme.ts (Zustand)
  utils/            sla.ts (computeSlaStatus, formatCurrency)
packages/shared/    Zod schemas + TypeScript types (shared with backend)
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- Backend running at `http://localhost:3001`

### 2. Setup
```bash
npm install
cp apps/web/.env.example apps/web/.env
# Set VITE_API_URL=http://localhost:3001
```

### 3. Run
```bash
npm run dev --workspace=apps/web
# Opens at http://localhost:5173
```

## Environment Variables

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3001

# Optional — for Google Sign-In
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Optional — for Microsoft Sign-In
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
```

## Pages & Routes

| Route | Page | Auth |
|---|---|---|
| `/` | Landing page | Public |
| `/login` | Login (email + Google + Microsoft) | Public |
| `/accept-invite?token=xxx` | Accept invite | Public |
| `/reset-password` | Force password reset | Semi-protected |
| `/admin` | Super Admin console | Separate auth |
| `/dashboard` | Dashboard — KPIs, follow-ups | Protected |
| `/contacts` | Contacts list with lead status | Protected |
| `/contacts/:id` | Contact 360 view | Protected |
| `/pipeline` | Kanban board + list view | Protected |
| `/deals/:id` | Deal detail + activity feed | Protected |
| `/users` | Team management | Protected |
| `/analytics` | Pipeline/Funnel/Forecast/Team | Protected |
| `/settings` | Workspace settings | Protected |

## Design System

**Theme:** Aurora Glow — dark first, `#10B981` green accent, layered surfaces.

**Dark mode tokens:**
```css
--bg:       #080810   /* page background */
--surface:  #0F0F1A   /* cards */
--surface-2:#161624   /* inputs, nav items */
--border:   #1E1E30   /* card borders */
--border-2: #252538   /* input borders */
--text:     #EEEEF8   /* primary text */
--text-2:   #9898B8   /* secondary text */
--text-3:   #55557A   /* muted / labels */
```

**SLA status colors (constant across themes):**
```
Overdue     → #E4483F (red)
Due today   → #F59E0B (amber)
Upcoming    → #3B82F6 (blue)
On track    → #10B981 (green)
Unscheduled → #6B7280 (grey)
```

## Auth Flow

1. Login → backend returns `accessToken` (15m) + `refreshToken` (30d)
2. Tokens stored in `localStorage`
3. Axios interceptor attaches Bearer on every request
4. On 401 → auto-calls `/auth/refresh` → retries original request
5. If refresh fails → clears tokens → redirects to `/login`

## Socket.IO

Connected automatically when user logs in via `useSocket()` hook in AppShell.

Rooms joined automatically:
- `tenant:{tenantId}` — board-wide events (`deal:moved`)
- `tenant:{tenantId}:user:{userId}` — personal notifications

Room joined manually on deal/contact detail pages:
- `record:deal:{id}` or `record:contact:{id}` — live activity feed

## Deploy to Vercel

```bash
# In Vercel dashboard:
# Root directory: apps/web
# Build command: npm run build
# Output directory: dist
# Environment variables: VITE_API_URL=https://your-api.onrender.com
```

## License
MIT
