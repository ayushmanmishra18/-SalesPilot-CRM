import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'
import { requestIdMiddleware } from './middleware/requestId'
import { apiRateLimit } from './middleware/rateLimit'
import { sendError } from './lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { logger } from './lib/logger'

// Routers
import authRouter          from './modules/auth/auth.router'
import adminRouter         from './modules/admin/admin.router'
import usersRouter         from './modules/users/users.router'
import contactsRouter      from './modules/contacts/contacts.router'
import dealsRouter         from './modules/deals/deals.router'
import activitiesRouter    from './modules/activities/activities.router'
import dashboardRouter     from './modules/dashboard/dashboard.router'
import notificationsRouter from './modules/notifications/notifications.router'
import settingsRouter      from './modules/settings/settings.router'
import analyticsRouter     from './modules/analytics/analytics.router'
import emailRouter         from './modules/email/email.router'
import documentsRouter     from './modules/documents/documents.router'
import publicRouter        from './modules/public/public.router'

export function createApp() {
  const app = express()

  // ── Trust proxy ─────────────────────────────────────────────────────────────
  // Render terminates TLS and proxies every request through exactly one hop, so
  // req.ip / X-Forwarded-For must be trusted for exactly 1 hop — not `true`
  // (which would trust the whole chain, letting a client spoof its own IP via
  // X-Forwarded-For and evade express-rate-limit's IP-based keying).
  app.set('trust proxy', 1)

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,   // Allow Socket.IO transport
    contentSecurityPolicy: false,       // Tighten in production if serving HTML
  }))

  // ── CORS — allow only the deployed frontend origin ─────────────────────────
  const corsOrigins = config.nodeEnv === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3000'] 
    : [config.frontendUrl]
  
  app.use(cors({
    origin:      corsOrigins,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge:      86400, // 24 hours for preflight caching
  }))

  // ── Request parsing ────────────────────────────────────────────────────────
  // 15mb accommodates the 10MB file the Documents upload UI advertises, base64-encoded
  // (~33% inflation) plus headroom for the rest of the JSON payload.
  app.use(express.json({ limit: '15mb' }))
  app.use(express.urlencoded({ extended: true, limit: '15mb' }))

  // ── Correlation ID + structured logging (wired first — cheapest moment) ────
  app.use(requestIdMiddleware)

  // ── Global rate limit ──────────────────────────────────────────────────────
  app.use(apiRateLimit)

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, ts: new Date().toISOString() })
  })

  // ── Routes ─────────────────────────────────────────────────────────────────
  // Super Admin — never behind withTenant/requireRole
  app.use('/admin', adminRouter)

  // Auth — no tenant context required
  app.use('/auth', authRouter)

  // Public marketing endpoints (landing page contact form) — unauthenticated by design
  app.use('/public', publicRouter)

  // Protected tenant routes
  app.use('/users',         usersRouter)
  app.use('/contacts',      contactsRouter)
  app.use('/deals',         dealsRouter)
  app.use('/activities',    activitiesRouter)
  app.use('/dashboard',     dashboardRouter)
  app.use('/notifications', notificationsRouter)
  app.use('/settings',      settingsRouter)
  app.use('/analytics',     analyticsRouter)
  app.use('/email',         emailRouter)
  app.use('/documents',     documentsRouter)

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    sendError(res, 404, ERROR_CODES.NOT_FOUND, `Route ${req.method} ${req.path} not found`)
  })

  // ── Global error handler ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('unhandled error', {
      requestId: req.requestId,
      err:       err.message,
      stack:     err.stack,
    })
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error')
  })

  return app
}
