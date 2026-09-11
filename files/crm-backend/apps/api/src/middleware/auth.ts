import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { sendError } from '../lib/errors'
import { ERROR_CODES, Role } from '@crm/shared'
import { Tenant } from '../models/Tenant'
import mongoose from 'mongoose'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId:   string
        tenantId: string
        role:     Role
        _userId:  mongoose.Types.ObjectId
        _tenantId:mongoose.Types.ObjectId
      }
    }
  }
}

// Extracts and validates the JWT from the Authorization header.
// Attaches req.auth — used by all protected routes.
export function withTenant(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Missing or invalid Authorization header')
    return
  }
  const token = header.slice(7)
  try {
    const payload = verifyAccessToken(token)
    req.auth = {
      userId:   payload.userId,
      tenantId: payload.tenantId,
      role:     payload.role as Role,
      _userId:  new mongoose.Types.ObjectId(payload.userId),
      _tenantId:new mongoose.Types.ObjectId(payload.tenantId),
    }
    next()
  } catch {
    sendError(res, 401, ERROR_CODES.TOKEN_EXPIRED, 'Token expired or invalid')
  }
}

// Checks that the authenticated user has one of the allowed roles.
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Not authenticated')
      return
    }
    if (!roles.includes(req.auth.role)) {
      sendError(res, 403, ERROR_CODES.FORBIDDEN, 'Insufficient permissions')
      return
    }
    next()
  }
}

// Checks that the tenant is active (not suspended)
export async function requireActiveTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) { next(); return }
  const tenant = await Tenant.findById(req.auth._tenantId).select('status').lean()
  if (!tenant || tenant.status === 'suspended') {
    sendError(res, 403, ERROR_CODES.TENANT_SUSPENDED, 'Tenant is suspended')
    return
  }
  next()
}
