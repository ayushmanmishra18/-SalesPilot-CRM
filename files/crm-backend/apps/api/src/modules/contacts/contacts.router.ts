import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { idempotency } from '../../middleware/idempotency'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { Contact } from '../../models/Contact'
import { Tenant } from '../../models/Tenant'
import { computeSlaStatus } from '../../lib/sla'
import { z } from 'zod'

const router = Router()
router.use(withTenant, requireActiveTenant)

const CreateContactSchema = z.object({
  name:       z.string().min(1).max(100),
  email:      z.string().email().optional().or(z.literal('')),
  phone:      z.string().max(20).optional(),
  company:    z.string().max(100).optional(),
  jobTitle:   z.string().max(100).optional(),
  notes:      z.string().max(2000).optional(),
  leadStatus: z.enum(['new','contacted','qualified','nurturing','converted','disqualified']).optional(),
  source:     z.enum(['website','referral','cold_outreach','event','social','other','']).optional(),
})

function serializeContact(c: any, slaConfig: any) {
  return {
    id:         c.publicId,
    name:       c.name,
    email:      c.email,
    phone:      c.phone,
    company:    c.company,
    jobTitle:   c.jobTitle,
    notes:      c.notes,
    leadStatus: c.leadStatus,
    source:     c.source,
    nextAction: c.nextAction ? { text: c.nextAction.text, dueDate: c.nextAction.dueDate, setBy: c.nextAction.setBy, setAt: c.nextAction.setAt } : null,
    slaStatus:  computeSlaStatus(c.nextAction, slaConfig),
    createdAt:  c.createdAt,
    updatedAt:  c.updatedAt,
  }
}

async function getTenantSlaConfig(tenantId: any) {
  const t = await Tenant.findById(tenantId).select('slaConfig').lean()
  return t?.slaConfig ?? { atRiskWindowDays: 3, unscheduledGraceHours: 24 }
}

// GET /contacts
router.get('/', async (req: Request, res: Response) => {
  const { q, page = '1', leadStatus, source } = req.query as any
  const pageNum = Math.max(1, parseInt(page, 10))
  const limit = 50

  const filter: any = { tenantId: req.auth!._tenantId, deletedAt: null }
  if (q) filter.$or = [
    { name:    { $regex: q, $options: 'i' } },
    { email:   { $regex: q, $options: 'i' } },
    { company: { $regex: q, $options: 'i' } },
  ]
  if (leadStatus) filter.leadStatus = leadStatus
  if (source)     filter.source     = source

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limit).limit(limit).lean(),
    Contact.countDocuments(filter),
  ])
  const slaConfig = await getTenantSlaConfig(req.auth!._tenantId)
  res.json({ contacts: contacts.map(c => serializeContact(c, slaConfig)), total, page: pageNum })
})

// GET /contacts/:id
router.get('/:id', async (req: Request, res: Response) => {
  const c = await Contact.findOne({ publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null }).lean()
  if (!c) { notFound(res, 'Contact'); return }
  const slaConfig = await getTenantSlaConfig(req.auth!._tenantId)
  res.json({ contact: serializeContact(c, slaConfig) })
})

// POST /contacts
router.post('/', requireRole('admin', 'member'), idempotency, validate(CreateContactSchema),
  async (req: Request, res: Response) => {
    const c = await Contact.create({ publicId: uuidv4(), tenantId: req.auth!._tenantId, ...req.body })
    const slaConfig = await getTenantSlaConfig(req.auth!._tenantId)
    res.status(201).json({ contact: serializeContact(c.toObject(), slaConfig) })
  }
)

// PATCH /contacts/:id
router.patch('/:id', requireRole('admin', 'member'), validate(CreateContactSchema.partial()),
  async (req: Request, res: Response) => {
    const c = await Contact.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null },
      { ...req.body }, { new: true }
    ).lean()
    if (!c) { notFound(res, 'Contact'); return }
    const slaConfig = await getTenantSlaConfig(req.auth!._tenantId)
    res.json({ contact: serializeContact(c, slaConfig) })
  }
)

// PATCH /contacts/:id/next-action
router.patch('/:id/next-action', requireRole('admin', 'member'),
  validate(z.object({ text: z.string().min(1), dueDate: z.string().datetime() })),
  async (req: Request, res: Response) => {
    const c = await Contact.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null },
      { nextAction: { text: req.body.text, dueDate: new Date(req.body.dueDate), setBy: req.auth!._userId, setAt: new Date() } },
      { new: true }
    ).lean()
    if (!c) { notFound(res, 'Contact'); return }
    const slaConfig = await getTenantSlaConfig(req.auth!._tenantId)
    res.json({ contact: serializeContact(c, slaConfig) })
  }
)

// DELETE /contacts/:id
router.delete('/:id', requireRole('admin', 'member'), async (req: Request, res: Response) => {
  const c = await Contact.findOneAndUpdate(
    { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null },
    { deletedAt: new Date() }
  )
  if (!c) { notFound(res, 'Contact'); return }
  res.json({ ok: true })
})

export default router
