import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { SuperAdmin } from '../../models/SuperAdmin'
import { Tenant } from '../../models/Tenant'
import { User } from '../../models/User'
import { Deal } from '../../models/Deal'
import { Lead } from '../../models/Lead'
import { requireSuperAdmin } from '../../middleware/adminAuth'
import { signAdminToken } from '../../lib/jwt'
import { sendError } from '../../lib/errors'
import { ERROR_CODES, DEFAULT_STAGES, DEFAULT_SLA_CONFIG } from '@crm/shared'
import { validate } from '../../middleware/validate'
import { authRateLimit } from '../../middleware/rateLimit'
import { z } from 'zod'

const router = createRouter()

// POST /admin/login
router.post('/login', authRateLimit, validate(z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})), async (req: Request, res: Response) => {
  const admin = await SuperAdmin.findOne({ email: req.body.email.toLowerCase() })
  if (!admin) { sendError(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials'); return }

  const valid = await bcrypt.compare(req.body.password, admin.passwordHash)
  if (!valid) { sendError(res, 401, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials'); return }

  admin.lastLoginAt = new Date()
  await admin.save()

  const token = signAdminToken({ adminId: admin._id.toString() })
  res.json({ token })
})

// All routes below require super admin token
router.use(requireSuperAdmin)

// GET /admin/tenants
router.get('/tenants', async (req: Request, res: Response) => {
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean()

  const tenantIds = tenants.map(t => t._id)
  const [userCounts, dealCounts] = await Promise.all([
    User.aggregate([
      { $match: { tenantId: { $in: tenantIds }, status: 'active' } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    Deal.aggregate([
      { $match: { tenantId: { $in: tenantIds }, deletedAt: null } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
  ])

  const userMap = Object.fromEntries(userCounts.map((u: any) => [u._id.toString(), u.count]))
  const dealMap = Object.fromEntries(dealCounts.map((d: any) => [d._id.toString(), d.count]))

  const result = await Promise.all(tenants.map(async (t) => {
    const firstAdmin = await User.findOne({ tenantId: t._id, role: 'admin' }).select('email').lean()
    return {
      id:         t.publicId,
      name:       t.name,
      currency:   t.currency,
      timezone:   t.timezone,
      status:     t.status,
      adminEmail: firstAdmin?.email ?? null,
      userCount:  userMap[t._id.toString()] ?? 0,
      dealCount:  dealMap[t._id.toString()] ?? 0,
      createdAt:  t.createdAt,
    }
  }))

  res.json({ tenants: result })
})

// POST /admin/tenants
router.post('/tenants', validate(z.object({
  name:       z.string().min(2).max(100),
  adminName:  z.string().min(2).max(100),
  adminEmail: z.string().email(),
})), async (req: Request, res: Response) => {
  const { name, adminName, adminEmail } = req.body

  const existing = await User.findOne({ email: adminEmail.toLowerCase() })
  if (existing) {
    sendError(res, 409, ERROR_CODES.EMAIL_TAKEN, 'This email already has an account')
    return
  }

  const tempPassword = uuidv4().slice(0, 12) + 'A1!'
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const session = await mongoose.startSession()
  let tenant: any, adminUser: any

  await session.withTransaction(async () => {
    ;[tenant] = await Tenant.create([{
      publicId: uuidv4(),
      name,
      currency: 'USD',
      timezone: 'UTC',
      status:   'active',
      stages:   DEFAULT_STAGES,
      slaConfig: DEFAULT_SLA_CONFIG,
      createdByAdminId: req.adminId,
    }], { session })

    ;[adminUser] = await User.create([{
      publicId:          uuidv4(),
      tenantId:          tenant._id,
      name:              adminName,
      email:             adminEmail.toLowerCase().trim(),
      authProvider:      'password',
      passwordHash,
      mustResetPassword: true,
      role:              'admin',
      status:            'active',
    }], { session })
  })

  session.endSession()

  res.status(201).json({
    tenant: {
      id:       tenant.publicId,
      name:     tenant.name,
      status:   tenant.status,
      createdAt:tenant.createdAt,
    },
    credentials: {
      email:    adminEmail.toLowerCase(),
      password: tempPassword,
    },
  })
})

// PATCH /admin/tenants/:id/suspend
router.patch('/tenants/:id/suspend', async (req: Request, res: Response) => {
  const tenant = await Tenant.findOneAndUpdate(
    { publicId: req.params.id },
    { status: 'suspended' },
    { new: true }
  )
  if (!tenant) { sendError(res, 404, ERROR_CODES.NOT_FOUND, 'Tenant not found'); return }
  res.json({ ok: true })
})

// PATCH /admin/tenants/:id/reactivate
router.patch('/tenants/:id/reactivate', async (req: Request, res: Response) => {
  const tenant = await Tenant.findOneAndUpdate(
    { publicId: req.params.id },
    { status: 'active' },
    { new: true }
  )
  if (!tenant) { sendError(res, 404, ERROR_CODES.NOT_FOUND, 'Tenant not found'); return }
  res.json({ ok: true })
})

// GET /admin/leads — leads captured by the landing page's contact form (see /public/leads)
router.get('/leads', async (req: Request, res: Response) => {
  const leads = await Lead.find().sort({ createdAt: -1 }).limit(200).lean()
  res.json({
    leads: leads.map(l => ({
      id:        l._id.toString(),
      name:      l.name,
      phone:     l.phone,
      company:   l.company,
      teamSize:  l.teamSize,
      challenge: l.challenge,
      contacted: l.contacted,
      createdAt: l.createdAt,
    })),
  })
})

// PATCH /admin/leads/:id/contacted — mark a lead as followed up
router.patch('/leads/:id/contacted', async (req: Request, res: Response) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, { contacted: true }, { new: true })
  if (!lead) { sendError(res, 404, ERROR_CODES.NOT_FOUND, 'Lead not found'); return }
  res.json({ ok: true })
})

export default router
