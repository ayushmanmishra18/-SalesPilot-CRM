import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../lib/logger'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      startTime: number
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = uuidv4()
  req.startTime = Date.now()

  res.setHeader('X-Request-Id', req.requestId)

  res.on('finish', () => {
    const duration = Date.now() - req.startTime
    logger.info('request', {
      requestId: req.requestId,
      method:    req.method,
      url:       req.originalUrl,
      status:    res.statusCode,
      durationMs: duration,
    })
  })

  next()
}
