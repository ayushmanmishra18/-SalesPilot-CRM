import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { withTenant } from '../../middleware/auth'
import { authRateLimit } from '../../middleware/rateLimit'
import { sendError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { config } from '../../config'
import {
  loginWithPassword,
  loginWithGoogle,
  loginWithMicrosoft,
  refreshTokens,
  logout,
  resetPassword,
  acceptInvitePassword,
} from './auth.service'
import { AppError } from '../../lib/errors'

const router = Router()

// POST /auth/login
router.post('/login', authRateLimit, validate(z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})), async (req: Request, res: Response) => {
  try {
    const { accessToken, refreshToken } = await loginWithPassword(req.body.email, req.body.password)
    res.json({ accessToken, refreshToken })
  } catch (e: any) {
    if (e instanceof AppError) {
      sendError(res, e.status, e.code, e.message)
    } else {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Login failed')
    }
  }
})

// POST /auth/login/google
router.post('/login/google', authRateLimit, validate(z.object({
  idToken: z.string().min(1),
})), async (req: Request, res: Response) => {
  try {
    const result = await loginWithGoogle(req.body.idToken)
    res.json(result)
  } catch (e: any) {
    if (e instanceof AppError) sendError(res, e.status, e.code, e.message)
    else sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Google login failed')
  }
})

// POST /auth/login/microsoft
router.post('/login/microsoft', authRateLimit, validate(z.object({
  accessToken: z.string().min(1),
})), async (req: Request, res: Response) => {
  try {
    const result = await loginWithMicrosoft(req.body.accessToken)
    res.json(result)
  } catch (e: any) {
    if (e instanceof AppError) sendError(res, e.status, e.code, e.message)
    else sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Microsoft login failed')
  }
})

// POST /auth/refresh
router.post('/refresh', authRateLimit, validate(z.object({
  refreshToken: z.string().min(1),
})), async (req: Request, res: Response) => {
  try {
    const result = await refreshTokens(req.body.refreshToken)
    res.json(result)
  } catch (e: any) {
    if (e instanceof AppError) sendError(res, e.status, e.code, e.message)
    else sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Refresh failed')
  }
})

// POST /auth/logout
router.post('/logout', validate(z.object({
  refreshToken: z.string().min(1),
})), async (req: Request, res: Response) => {
  await logout(req.body.refreshToken).catch(() => {})
  res.json({ ok: true })
})

// POST /auth/reset-password  (requires valid access token — mustResetPassword flow)
router.post('/reset-password', withTenant, validate(z.object({
  password:        z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })),
async (req: Request, res: Response) => {
  try {
    await resetPassword(req.auth!.userId, req.body.password)
    res.json({ ok: true })
  } catch (e: any) {
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Password reset failed')
  }
})

// POST /auth/accept-invite
router.post('/accept-invite', authRateLimit, validate(z.object({
  token:    z.string().min(1),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
})), async (req: Request, res: Response) => {
  try {
    const result = await acceptInvitePassword(req.body.token, req.body.password)
    res.json(result)
  } catch (e: any) {
    if (e instanceof AppError) sendError(res, e.status, e.code, e.message)
    else sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Accept invite failed')
  }
})

export default router
