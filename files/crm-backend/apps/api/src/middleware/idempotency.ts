import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { sendError } from '../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { IdempotencyKey } from '../models/IdempotencyKey'

export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['idempotency-key'] as string | undefined

  if (!key) {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Idempotency-Key header is required for this request')
    return
  }

  if (!req.auth) { next(); return }

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body))
    .digest('hex')

  // Async IIFE so we can await inside sync middleware
  ;(async () => {
    const existing = await IdempotencyKey.findOne({
      tenantId:       req.auth!._tenantId,
      userId:         req.auth!._userId,
      idempotencyKey: key,
    }).lean()

    if (existing) {
      if (existing.requestHash !== requestHash) {
        sendError(res, 409, ERROR_CODES.DUPLICATE_REQUEST, 'Idempotency key reused with different request body')
        return
      }
      // Return the original response
      res.status(existing.statusCode).json(existing.response)
      return
    }

    // Intercept the response to store it
    const originalJson = res.json.bind(res)
    res.json = (body: any) => {
      const statusCode = res.statusCode

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      IdempotencyKey.create({
        tenantId:       req.auth!._tenantId,
        userId:         req.auth!._userId,
        idempotencyKey: key,
        requestHash,
        response:       body,
        statusCode,
        expiresAt,
      }).catch(() => {}) // best-effort

      return originalJson(body)
    }

    next()
  })().catch(() => next())
}
