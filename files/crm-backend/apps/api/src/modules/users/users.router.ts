import { Router, Request, Response } from 'express'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { idempotency } from '../../middleware/idempotency'
import { validate } from '../../middleware/validate'
import { sendError, notFound } from '../../lib/errors'
import { ERROR_CODES, InviteUserSchema, UpdateUserRoleSchema } from '@crm/shared'
import { User } from '../../models/User'
import { Tenant } from '../../models/Tenant'
import { inviteUser } from '../auth/auth.service'
import { config } from '../../config'

const router = Router()
router.use(withTenant, requireActiveTenant)

function serializeUser(u: any) {
  return {
    id:           u.publicId,
    name:         u.name,
    email:        u.email,
    role:         u.role,
    status:       u.status,
    authProvider: u.authProvider,
    createdAt:    u.createdAt,
  }
}

// GET /users
router.get('/', async (req: Request, res: Response) => {
  const users = await User.find({ tenantId: req.auth!._tenantId }).sort({ createdAt: 1 }).lean()
  res.json({ users: users.map(serializeUser) })
})

// POST /users/invite  (admin only + idempotency)
router.post('/invite', requireRole('admin'), idempotency, validate(InviteUserSchema),
  async (req: Request, res: Response) => {
    try {
      const tenant = await Tenant.findById(req.auth!._tenantId).lean()
      const inviter = await User.findById(req.auth!._userId).lean()
      if (!tenant || !inviter) { notFound(res, 'Tenant'); return }

      const result = await inviteUser({
        tenantId:    req.auth!._tenantId,
        inviterName: inviter.name,
        companyName: tenant.name,
        email:       req.body.email,
        name:        req.body.name,
        role:        req.body.role,
        frontendUrl: config.frontendUrl,
      })

      res.status(201).json(result)
    } catch (e: any) {
      if (e.code === ERROR_CODES.EMAIL_TAKEN) { sendError(res, 409, e.code, e.message); return }
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Invite failed')
    }
  }
)

// PATCH /users/:id/role  (admin only)
router.patch('/:id/role', requireRole('admin'), validate(UpdateUserRoleSchema),
  async (req: Request, res: Response) => {
    const user = await User.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId },
      { role: req.body.role },
      { new: true }
    )
    if (!user) { notFound(res, 'User'); return }
    res.json({ user: serializeUser(user) })
  }
)

// DELETE /users/:id  (admin only — cannot remove self)
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  if (req.params.id === req.auth!.userId) {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Cannot remove yourself')
    return
  }
  const user = await User.findOneAndDelete({
    publicId: req.params.id,
    tenantId: req.auth!._tenantId,
  })
  if (!user) { notFound(res, 'User'); return }
  res.json({ ok: true })
})

export default router
