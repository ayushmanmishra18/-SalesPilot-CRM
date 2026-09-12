import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { v4 as uuidv4 } from 'uuid'
import { Server as IOServer } from 'socket.io'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { idempotency } from '../../middleware/idempotency'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import {
  ERROR_CODES,
  CreateDealSchema,
  UpdateDealSchema,
  MoveDealStageSchema,
  CloseDealSchema,
  SetDealNextActionSchema,
} from '@crm/shared'
import { Deal } from '../../models/Deal'
import { Tenant } from '../../models/Tenant'
import { Contact } from '../../models/Contact'
import { User } from '../../models/User'
import { computeSlaStatus } from '../../lib/sla'
import { getSlaQueue, slaJobId } from '../../lib/slaQueue'

// contactId/ownerId are exposed and accepted everywhere else in the API as
// publicId (UUID) — never the internal Mongo ObjectId. Resolve a publicId to
// its ObjectId here so we never hand a raw string straight to an ObjectId
// field (that throws a CastError and, before the asyncRouter fix, crashed the
// whole process).
async function resolveContactObjectId(tenantId: any, contactPublicId: string) {
  const contact = await Contact.findOne({ publicId: contactPublicId, tenantId, deletedAt: null }).select('_id').lean()
  return contact?._id ?? null
}
async function resolveUserObjectId(tenantId: any, userPublicId: string) {
  const user = await User.findOne({ publicId: userPublicId, tenantId }).select('_id').lean()
  return user?._id ?? null
}

const router = createRouter()
router.use(withTenant, requireActiveTenant)

let _io: IOServer | null = null
export function setIo(io: IOServer) { _io = io }

async function getTenant(tenantId: any) {
  return Tenant.findById(tenantId).select('slaConfig currency stages').lean()
}

// Shared populate spec so every Deal read resolves contactId/ownerId into
// { publicId } for serializeDeal, instead of leaving raw ObjectIds.
const DEAL_POPULATE = [
  { path: 'contactId', select: 'publicId' },
  { path: 'ownerId',   select: 'publicId' },
]

function serializeDeal(d: any, tenant: any) {
  const slaStatus = computeSlaStatus(d.nextAction, tenant.slaConfig)
  return {
    id:                d.publicId,
    tenantId:          d.tenantId,
    title:             d.title,
    value:             d.value,
    currency:          tenant.currency,
    stage:             d.stage,
    stageHistory:      (d.stageHistory ?? []).map((h: any) => ({
      stage:   h.stage,
      movedBy: h.movedBy,
      movedAt: h.movedAt,
    })),
    expectedCloseDate: d.expectedCloseDate,
    // `contactId`/`ownerId` are populated (see population helper below) — expose the
    // public UUID, matching every other resource's external contract, never the raw ObjectId
    contactId:         d.contactId?.publicId ?? null,
    ownerId:           d.ownerId?.publicId ?? null,
    status:            d.status,
    lostReason:        d.lostReason,
    nextAction:        d.nextAction ? {
      text:    d.nextAction.text,
      dueDate: d.nextAction.dueDate,
      setBy:   d.nextAction.setBy,
      setAt:   d.nextAction.setAt,
    } : null,
    slaStatus,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

async function scheduleSlaJob(deal: any, tenant: any) {
  if (!deal.nextAction?.dueDate || deal.status !== 'open') return
  const queue = getSlaQueue()
  const jobId = slaJobId(deal.publicId, 'sla:overdue')
  const delay = Math.max(0, new Date(deal.nextAction.dueDate).getTime() - Date.now())

  // Remove any existing job first (idempotent reschedule)
  try { await queue.remove(jobId) } catch {}

  await queue.add('sla:overdue', {
    type:     'sla:overdue',
    dealId:   deal.publicId,
    tenantId: deal.tenantId.toString(),
    userId:   deal.ownerId.toString(),
  }, { jobId, delay })
}

async function cancelSlaJob(dealPublicId: string) {
  try {
    const queue = getSlaQueue()
    await queue.remove(slaJobId(dealPublicId, 'sla:overdue'))
  } catch {}
}

// GET /deals
router.get('/', async (req: Request, res: Response) => {
  const { status, stage, ownerId } = req.query as any
  const filter: any = { tenantId: req.auth!._tenantId, deletedAt: null }
  if (status)  filter.status  = status
  if (stage)   filter.stage   = stage
  if (ownerId) {
    // ownerId is passed as a user publicId (external contract) — resolve to the real ObjectId.
    const resolvedOwnerId = await resolveUserObjectId(req.auth!._tenantId, ownerId)
    if (!resolvedOwnerId) { res.json({ deals: [] }); return } // unknown user in this tenant — no matches, not an error
    filter.ownerId = resolvedOwnerId
  }

  const [deals, tenant] = await Promise.all([
    Deal.find(filter).sort({ createdAt: -1 }).populate(DEAL_POPULATE).lean(),
    getTenant(req.auth!._tenantId),
  ])
  if (!tenant) { sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Tenant not found'); return }

  res.json({ deals: deals.map(d => serializeDeal(d, tenant)) })
})

// GET /deals/:id
router.get('/:id', async (req: Request, res: Response) => {
  const [deal, tenant] = await Promise.all([
    Deal.findOne({ publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null }).populate(DEAL_POPULATE).lean(),
    getTenant(req.auth!._tenantId),
  ])
  if (!deal)   { notFound(res, 'Deal');   return }
  if (!tenant) { notFound(res, 'Tenant'); return }
  res.json({ deal: serializeDeal(deal, tenant) })
})

// POST /deals
router.post('/', requireRole('admin', 'member'), idempotency, validate(CreateDealSchema),
  async (req: Request, res: Response) => {
    const tenant = await getTenant(req.auth!._tenantId)
    if (!tenant) { sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Tenant not found'); return }

    // Validate stage exists in tenant config
    const validStage = tenant.stages.find((s: any) => s.name === req.body.stage)
    if (!validStage) {
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Invalid stage')
      return
    }

    // contactId (if provided) is a contact publicId — resolve it to the real ObjectId.
    // Never pass the raw string straight into an ObjectId field: an unresolved/invalid
    // id throws a Mongoose CastError, which used to crash the whole process.
    let resolvedContactId = null
    if (req.body.contactId) {
      resolvedContactId = await resolveContactObjectId(req.auth!._tenantId, req.body.contactId)
      if (!resolvedContactId) {
        sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Contact not found')
        return
      }
    }

    const deal = await Deal.create({
      publicId: uuidv4(),
      tenantId: req.auth!._tenantId,
      ownerId:  req.auth!._userId,
      title:    req.body.title,
      value:    req.body.value ?? 0,
      stage:    req.body.stage,
      contactId:resolvedContactId,
      expectedCloseDate: req.body.expectedCloseDate ?? null,
      stageHistory: [{ stage: req.body.stage, movedBy: req.auth!._userId, movedAt: new Date() }],
    })
    await deal.populate(DEAL_POPULATE)

    res.status(201).json({ deal: serializeDeal(deal.toObject(), tenant) })
  }
)

// PATCH /deals/:id
router.patch('/:id', requireRole('admin', 'member'), validate(UpdateDealSchema),
  async (req: Request, res: Response) => {
    const updates: any = { ...req.body }

    // Same publicId -> ObjectId resolution as create (see POST /deals above)
    if ('contactId' in updates) {
      if (updates.contactId) {
        const resolved = await resolveContactObjectId(req.auth!._tenantId, updates.contactId)
        if (!resolved) { sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Contact not found'); return }
        updates.contactId = resolved
      } else {
        updates.contactId = null
      }
    }

    const [deal, tenant] = await Promise.all([
      Deal.findOneAndUpdate(
        { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null },
        updates,
        { new: true }
      ).populate(DEAL_POPULATE).lean(),
      getTenant(req.auth!._tenantId),
    ])
    if (!deal)   { notFound(res, 'Deal');   return }
    if (!tenant) { notFound(res, 'Tenant'); return }
    res.json({ deal: serializeDeal(deal, tenant) })
  }
)

// PATCH /deals/:id/stage
router.patch('/:id/stage', requireRole('admin', 'member'), validate(MoveDealStageSchema),
  async (req: Request, res: Response) => {
    const tenant = await getTenant(req.auth!._tenantId)
    if (!tenant) { sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Tenant not found'); return }

    const validStage = tenant.stages.find((s: any) => s.name === req.body.stage)
    if (!validStage) { sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Invalid stage'); return }

    const deal = await Deal.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null, status: 'open' },
      {
        stage: req.body.stage,
        $push: { stageHistory: { stage: req.body.stage, movedBy: req.auth!._userId, movedAt: new Date() } },
      },
      { new: true }
    ).populate(DEAL_POPULATE).lean()
    if (!deal) { notFound(res, 'Deal'); return }

    // Emit live board update
    _io?.to(`tenant:${req.auth!.tenantId}`).emit('deal:moved', {
      dealId: deal.publicId,
      stage:  req.body.stage,
    })

    res.json({ deal: serializeDeal(deal, tenant) })
  }
)

// POST /deals/:id/close
router.post('/:id/close', requireRole('admin', 'member'), validate(CloseDealSchema),
  async (req: Request, res: Response) => {
    const { status, lostReason } = req.body

    const deal = await Deal.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null, status: 'open' },
      {
        status,
        lostReason:  lostReason ?? null,
        nextAction:  null,   // clear on close
        stage:       status === 'won' ? 'Won' : 'Lost',
        $push: { stageHistory: { stage: status === 'won' ? 'Won' : 'Lost', movedBy: req.auth!._userId, movedAt: new Date() } },
      },
      { new: true }
    ).populate(DEAL_POPULATE).lean()
    if (!deal) { notFound(res, 'Deal'); return }

    // Cancel any pending SLA job
    await cancelSlaJob(deal.publicId)

    const tenant = await getTenant(req.auth!._tenantId)
    res.json({ deal: serializeDeal(deal, tenant!) })
  }
)

// PATCH /deals/:id/next-action
router.patch('/:id/next-action', requireRole('admin', 'member'), validate(SetDealNextActionSchema),
  async (req: Request, res: Response) => {
    const deal = await Deal.findOneAndUpdate(
      { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null, status: 'open' },
      {
        nextAction: {
          text:    req.body.text,
          dueDate: new Date(req.body.dueDate),
          setBy:   req.auth!._userId,
          setAt:   new Date(),
        },
      },
      { new: true }
    ).lean()
    if (!deal) { notFound(res, 'Deal'); return }

    const tenant = await getTenant(req.auth!._tenantId)
    if (!tenant) { notFound(res, 'Tenant'); return }

    // Schedule SLA overdue job — must run on the raw (unpopulated) ownerId ObjectId
    await scheduleSlaJob(deal, tenant).catch(() => {})

    // Populate for the response only, after scheduling (which needs the raw ObjectId)
    await Deal.populate(deal, DEAL_POPULATE)
    res.json({ deal: serializeDeal(deal, tenant) })
  }
)

// DELETE /deals/:id (soft delete)
router.delete('/:id', requireRole('admin', 'member'), async (req: Request, res: Response) => {
  const deal = await Deal.findOneAndUpdate(
    { publicId: req.params.id, tenantId: req.auth!._tenantId, deletedAt: null },
    { deletedAt: new Date() }
  )
  if (!deal) { notFound(res, 'Deal'); return }
  await cancelSlaJob(deal.publicId)
  res.json({ ok: true })
})

export default router
