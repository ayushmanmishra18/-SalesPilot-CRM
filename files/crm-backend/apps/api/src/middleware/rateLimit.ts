import rateLimit from 'express-rate-limit'
import { ERROR_CODES } from '@crm/shared'
import { Request, Response } from 'express'

function errorHandler(_req: Request, res: Response) {
  const requestId = (_req as any).requestId ?? 'unknown'
  res.status(429).json({
    error: {
      code:      ERROR_CODES.RATE_LIMITED,
      message:   'Too many requests, please try again later',
      requestId,
    },
  })
}

// Strict limit for login/invite — keyed by IP
export const authRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          errorHandler,
})

// General API limit — keyed by user+tenant (or IP if not authed)
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      300,
  keyGenerator: (req: Request) => {
    if ((req as any).auth) {
      return `${(req as any).auth.userId}:${(req as any).auth.tenantId}`
    }
    return req.ip ?? 'unknown'
  },
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         errorHandler,
})
