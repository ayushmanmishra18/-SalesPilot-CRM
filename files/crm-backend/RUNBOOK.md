# CRM Backend — Runbook

**RPO:** 24 hours | **RTO:** 4 hours  
Last updated: 2026-09

---

## 1. Daily Backup (mongoexport)

Run this cron daily (e.g. via a GitHub Actions scheduled job or Render cron service):

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/crm-backup-${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Export every collection
for COLL in tenants users superadmins refreshtokens contacts deals activities notifications idempotencykeys emailaccounts documents; do
  mongoexport \
    --uri="$MONGODB_URI" \
    --collection="$COLL" \
    --out="$BACKUP_DIR/$COLL.json"
done

# Compress
tar -czf "/tmp/crm-backup-${TIMESTAMP}.tar.gz" -C /tmp "crm-backup-${TIMESTAMP}"
rm -rf "$BACKUP_DIR"

# Upload to Cloudflare R2 or S3
# aws s3 cp "/tmp/crm-backup-${TIMESTAMP}.tar.gz" "s3://your-bucket/backups/"
# or: rclone copy "/tmp/crm-backup-${TIMESTAMP}.tar.gz" r2:your-bucket/backups/

echo "Backup complete: crm-backup-${TIMESTAMP}.tar.gz"
```

Retain 30 days of backups. Oldest are pruned automatically if using R2 lifecycle rules.

---

## 2. Restore Procedure

```bash
# 1. Download the backup
# aws s3 cp "s3://your-bucket/backups/crm-backup-TIMESTAMP.tar.gz" /tmp/

# 2. Extract
tar -xzf /tmp/crm-backup-TIMESTAMP.tar.gz -C /tmp/

# 3. Restore each collection (--drop wipes existing data first — confirm intent)
for COLL in tenants users superadmins refreshtokens contacts deals activities notifications emailaccounts documents; do
  mongoimport \
    --uri="$MONGODB_URI" \
    --collection="$COLL" \
    --drop \
    --file="/tmp/crm-backup-TIMESTAMP/$COLL.json"
done

echo "Restore complete. Restart API and worker."
```

**Test this procedure once before Phase 5 go-live.** An untested backup is a theory.

---

## 3. Deployment

### API (Render)
- Service type: **Web Service** (not serverless)
- Build command: `npm run build --workspace=apps/api`
- Start command: `node apps/api/dist/index.js`
- Auto-deploy on push to `main`

### Worker (Render)
- Service type: **Background Worker** (persistent, not a web service)
- Build command: `npm run build --workspace=apps/worker`
- Start command: `node apps/worker/dist/index.js`
- Same repo, same env vars as API

### Frontend (Vercel)
- Root directory: `apps/web`
- Build command: `vite build`
- Output: `dist/`
- Env: `VITE_API_URL=https://your-api.onrender.com`

---

## 4. Environment Variables Checklist

All env vars must be set in Render dashboard (never committed):

| Var | Required | Notes |
|-----|----------|-------|
| `MONGODB_URI` | ✅ | Atlas M0 connection string |
| `REDIS_URL` | ✅ | Upstash Redis URL |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, different from access |
| `SUPER_ADMIN_EMAIL` | ✅ | First super admin |
| `SUPER_ADMIN_PASSWORD` | ✅ | Change after first login |
| `FRONTEND_URL` | ✅ | Exact Vercel URL (no trailing slash) |
| `GOOGLE_CLIENT_ID` | Optional | For Sign in with Google |
| `GOOGLE_GMAIL_CLIENT_ID` | Optional | For Gmail send integration |
| `GOOGLE_GMAIL_CLIENT_SECRET` | Optional | Gmail OAuth |
| `GOOGLE_GMAIL_REDIRECT_URI` | Optional | Must match Google Console |
| `MICROSOFT_CLIENT_ID` | Optional | For Sign in with Microsoft |
| `SMTP_HOST/PORT/USER/PASS` | Optional | For invite emails |

---

## 5. Common Incidents

### API returns 503 / not reachable
1. Check Render dashboard — is the service running?
2. Check MongoDB connection: `curl https://your-api.onrender.com/health`
3. Check Atlas M0 — is the IP allowlist blocking Render's IP? Set `0.0.0.0/0` for simplicity on free tier.
4. Check Redis: Upstash dashboard → connection log

### Worker not processing jobs
1. Check Render background worker logs
2. Verify `REDIS_URL` matches the API's Redis
3. Check BullMQ queue in Upstash: `KEYS bullmq:*`
4. Restart the worker service in Render

### SLA notifications not firing
1. Check worker logs for job processing
2. Verify `nextAction.dueDate` is set on the deal (UTC)
3. Check Notification collection: `db.notifications.find({type:'sla_overdue'}).sort({createdAt:-1}).limit(5)`
4. If BullMQ queue is backed up: `npm run flush-queue` (add a script if needed)

### Atlas M0 at capacity (512MB)
1. Check collection sizes: `db.stats()`
2. Verify TTL indexes are running: `db.notifications.getIndexes()` — look for `expireAfterSeconds`
3. Force TTL sweep if needed: TTL background task runs every 60s by default
4. If still over: export and drop old Activities (`deletedAt` not null, older than 90 days)

### Refresh token reuse detected (security)
1. All tokens in that family are auto-revoked — user will be logged out
2. Check logs for `refresh token reuse detected` with the tenantId/userId
3. If legitimate (double-click/race), the user just needs to log in again
4. If suspicious: check for other anomalous activity on that account

---

## 6. MongoDB Index Verification

Run after deploy to confirm all indexes exist:

```js
db.notifications.getIndexes()    // should have TTL on createdAt
db.idempotencykeys.getIndexes()  // should have TTL on expiresAt
db.refreshtokens.getIndexes()    // should have TTL on expiresAt
db.deals.getIndexes()            // tenantId+status+nextAction.dueDate
db.users.getIndexes()            // email unique global
```
