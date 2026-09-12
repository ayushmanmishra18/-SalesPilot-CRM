import { Router } from 'express'

// Express 4 does NOT catch rejected promises / thrown errors from async route
// handlers — an unhandled rejection from one request bubbles up to the
// process-level `unhandledRejection` handler in index.ts, which exits the
// entire process. That means any bad input that trips a Mongoose CastError/
// ValidationError (or any other thrown error) in an async handler takes down
// the API for every tenant, not just the one request.
//
// createRouter() wraps every HTTP-verb method so a rejected/thrown error from
// an async handler is forwarded to `next(err)` instead — routing it to the
// app-wide error middleware (which already replies with a clean 500), rather
// than crashing the process.
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'options', 'head'] as const

export function createRouter() {
  const router = Router()
  for (const method of METHODS) {
    const original = (router as any)[method].bind(router)
    ;(router as any)[method] = (path: any, ...handlers: any[]) => {
      const wrapped = handlers.map((h) => {
        if (typeof h !== 'function') return h
        return (req: any, res: any, next: any) => {
          try {
            const result = h(req, res, next)
            if (result && typeof result.catch === 'function') {
              result.catch(next)
            }
          } catch (err) {
            next(err)
          }
        }
      })
      return original(path, ...wrapped)
    }
  }
  return router
}
