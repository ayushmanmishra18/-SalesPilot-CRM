import { Router, Request, Response } from 'express'
import { withTenant, requireActiveTenant } from '../../middleware/auth'
import { Deal } from '../../models/Deal'
import { Contact } from '../../models/Contact'
import { Tenant } from '../../models/Tenant'
import { computeSlaStatus } from '../../lib/sla'

const router = Router()
router.use(withTenant, requireActiveTenant)

// GET /dashboard/followups — deals needing attention (live SLA)
router.get('/followups', async (req: Request, res: Response) => {
  const role     = req.auth!.role
  const tenantId = req.auth!._tenantId

  const tenant = await Tenant.findById(tenantId).select('slaConfig currency').lean()
  if (!tenant) { res.json({ followups: [] }); return }

  const filter: any = { tenantId, status: 'open', deletedAt: null }
  // Members see only their own deals' follow-ups
  if (role === 'member') filter.ownerId = req.auth!._userId

  const deals = await Deal.find(filter)
    .sort({ 'nextAction.dueDate': 1 })
    .lean()

  const followups = deals
    .map(d => ({
      dealId:    d.publicId,
      title:     d.title,
      ownerId:   d.ownerId,
      stage:     d.stage,
      value:     d.value,
      nextAction:d.nextAction ? {
        text:    d.nextAction.text,
        dueDate: d.nextAction.dueDate,
      } : null,
      slaStatus: computeSlaStatus(d.nextAction, tenant.slaConfig),
    }))
    .filter(f => ['overdue', 'due_today', 'upcoming', 'unscheduled'].includes(f.slaStatus))
    .sort((a, b) => {
      const order: any = { overdue: 0, due_today: 1, upcoming: 2, unscheduled: 3, on_track: 4 }
      return (order[a.slaStatus] ?? 5) - (order[b.slaStatus] ?? 5)
    })

  res.json({ followups })
})

// GET /dashboard/summary
router.get('/summary', async (req: Request, res: Response) => {
  const tenantId = req.auth!._tenantId

  const tenant = await Tenant.findById(tenantId).select('slaConfig currency stages').lean()
  if (!tenant) { res.json({ summary: {} }); return }

  const now              = new Date()
  const startOfMonth     = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1)

  const [openDeals, wonDeals, recentContacts] = await Promise.all([
    Deal.find({ tenantId, status: 'open', deletedAt: null }).lean(),
    Deal.find({ tenantId, status: 'won',  deletedAt: null, updatedAt: { $gte: startOfMonth } }).lean(),
    Contact.find({ tenantId, deletedAt: null }).sort({ createdAt: -1 }).limit(5).lean(),
  ])

  const openPipelineValue = openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const wonThisMonth      = wonDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)

  const overdueCount  = openDeals.filter(d =>
    computeSlaStatus(d.nextAction as any, tenant.slaConfig) === 'overdue'
  ).length

  const dueTodayCount = openDeals.filter(d =>
    computeSlaStatus(d.nextAction as any, tenant.slaConfig) === 'due_today'
  ).length

  // Deals by stage — use tenant stages as the structure
  const dealsByStage = tenant.stages
    .filter((s: any) => !s.isTerminal)
    .map((s: any) => {
      const stageDeals = openDeals.filter((d: any) => d.stage === s.name)
      return {
        stage: s.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum: number, d: any) => sum + (d.value ?? 0), 0),
      }
    })

  res.json({
    summary: {
      currency:          tenant.currency,
      openPipelineValue,
      wonThisMonth,
      overdueCount,
      dueTodayCount,
      dealsByStage,
      recentContacts: recentContacts.map((c: any) => ({
        id:      c.publicId,
        name:    c.name,
        company: c.company,
        email:   c.email,
      })),
    },
  })
})

export default router
