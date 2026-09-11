import { Response } from 'express'
import { ERROR_CODES, ErrorCode } from '@crm/shared'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    public readonly message: string,
    public readonly status: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): void {
  const requestId = (res.req as any).requestId ?? 'unknown'
  res.status(status).json({
    error: { code, message, requestId, ...(details ? { details } : {}) },
  })
}

export function notFound(res: Response, what: string): void {
  sendError(res, 404, ERROR_CODES.NOT_FOUND, `${what} not found`)
}

export function forbidden(res: Response): void {
  sendError(res, 403, ERROR_CODES.FORBIDDEN, 'Insufficient permissions')
}
