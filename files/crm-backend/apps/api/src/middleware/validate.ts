import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { sendError } from '../lib/errors'
import { ERROR_CODES } from '@crm/shared'

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = buildDetails(result.error)
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details)
      return
    }
    req[source] = result.data
    next()
  }
}

function buildDetails(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_'
    out[key] = [...(out[key] ?? []), issue.message]
  }
  return out
}
