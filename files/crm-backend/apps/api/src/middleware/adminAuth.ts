import { Request, Response, NextFunction } from 'express'
import { verifyAdminToken } from '../lib/jwt'
import { sendError } from '../lib/errors'
import { ERROR_CODES } from '@crm/shared'

declare global {
  namespace Express {
    interface Request {
      adminId?: string
    }
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Super admin token required')
    return
  }
  const token = header.slice(7)
  try {
    const payload = verifyAdminToken(token)
    req.adminId   = payload.adminId
    next()
  } catch {
    sendError(res, 401, ERROR_CODES.TOKEN_INVALID, 'Invalid super admin token')
  }
}
