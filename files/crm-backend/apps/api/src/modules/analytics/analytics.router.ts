import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { Deal } from '../../models/Deal'
import { User } from '../../models/User'
import { Tenant } from '../../models/Tenant'
import { computeSlaStatus } from '../../lib/sla'

const router = createRouter()
router.use(withTenant, requireActiveTenant)

// GET /analytics/pipeline  — pipeline-level analytics (admin/member)
router.get('/pipeline', async (req: Request, res: Response) => {
  const tenantId = req.auth!._tenantId

  const tenant = await Tenant.findById(tenantId).select('slaConfig currency stages').lean()
  if (!tenant) { res.json({}); return }

  const now           = new Date()
  const startOfMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const startOfLast   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const endOfLast     = new Date(startOfMonth.getTime() - 1)

  const [openDeals, wonDeals, lostDeals, wonLastMonth] = await Promise.all([
    Deal.find({ tenantId, status: 'open',  deletedAt: null }).lean(),
    Deal.find({ tenantId, status: 'won',   deletedAt: null, updatedAt: { $gte: startOfMonth } }).lean(),
    Deal.find({ tenantId, status: 'lost',  deletedAt: null, updatedAt: { $gte: startOfMonth } }).lean(),
    Deal.find({ tenantId, status: 'won',   deletedAt: null, updatedAt: { $gte: startOfLast, $lte: endOfLast } }).lean(),
  ])

  const openValue    = openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const wonValue     = wonDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const wonLastValue = wonLastMonth.reduce((s: number, d: any) => s + (d.value ?? 0), 0)

  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0

  // Deals by stage for open pipeline
  const dealsByStage = (tenant.stages as any[])
    .filter((s: any) => !s.isTerminal)
    .map((s: any) => {
      const stageDeals = openDeals.filter((d: any) => d.stage === s.name)
      return {
        stage: s.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum: number, d: any) => sum + (d.value ?? 0), 0),
      }
    })

  // SLA breakdown
  const slaBreakdown = {
    overdue:     0,
    due_today:   0,
    upcoming:    0,
    on_track:    0,
    unscheduled: 0,
  }
  for (const d of openDeals) {
    const status = computeSlaStatus((d as any).nextAction, (tenant as any).slaConfig)
    ;(slaBreakdown as any)[status] = ((slaBreakdown as any)[status] ?? 0) + 1
  }

  res.json({
    currency:      (tenant as any).currency,
    openCount:     openDeals.length,
    openValue,
    wonThisMonth:  wonValue,
    wonLastMonth:  wonLastValue,
    wonCountMonth: wonDeals.length,
    winRate,
    dealsByStage,
    slaBreakdown,
  })
})

// GET /analytics/reps  — per-rep performance (admin only)
router.get('/reps', requireRole('admin'), async (req: Request, res: Response) => {
  const tenantId = req.auth!._tenantId

  const tenant = await Tenant.findById(tenantId).select('slaConfig currency').lean()
  if (!tenant) { res.json({ reps: [] }); return }

  const now          = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const users = await User.find({ tenantId, status: 'active' }).lean()

  const reps = await Promise.all(
    users.map(async (u: any) => {
      const [openDeals, wonDeals, lostDeals] = await Promise.all([
        Deal.find({ tenantId, ownerId: u._id, status: 'open',  deletedAt: null }).lean(),
        Deal.find({ tenantId, ownerId: u._id, status: 'won',   deletedAt: null, updatedAt: { $gte: startOfMonth } }).lean(),
        Deal.find({ tenantId, ownerId: u._id, status: 'lost',  deletedAt: null, updatedAt: { $gte: startOfMonth } }).lean(),
      ])

      const overdueCount = openDeals.filter((d: any) =>
        computeSlaStatus((d as any).nextAction, (tenant as any).slaConfig) === 'overdue'
      ).length

      const winRate = wonDeals.length + lostDeals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
        : 0

      return {
        userId:       u.publicId,
        name:         u.name,
        role:         u.role,
        openCount:    openDeals.length,
        openValue:    openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0),
        wonThisMonth: wonDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0),
        wonCount:     wonDeals.length,
        overdueCount,
        winRate,
      }
    })
  )

  res.json({ reps, currency: (tenant as any).currency })
})

export default router

// GET /analytics/funnel — stage-by-stage funnel data
router.get('/funnel', async (req: Request, res: Response) => {
  const tenantId = req.auth!._tenantId
  const tenant   = await Tenant.findById(tenantId).select('slaConfig currency stages').lean()
  if (!tenant) { res.json({}); return }

  const openDeals = await Deal.find({ tenantId, status: 'open', deletedAt: null }).lean()
  const stages    = (tenant.stages as any[]).filter((s: any) => !s.isTerminal)

  const funnel = stages.map((s: any) => {
    const stageDeals = openDeals.filter((d: any) => d.stage === s.name)
    return {
      stage: s.name,
      count: stageDeals.length,
      value: stageDeals.reduce((sum: number, d: any) => sum + (d.value ?? 0), 0),
    }
  })

  res.json({ funnel, currency: (tenant as any).currency })
})

// GET /analytics/forecast — simple probability-weighted forecast
router.get('/forecast', async (req: Request, res: Response) => {
  const tenantId = req.auth!._tenantId
  const tenant   = await Tenant.findById(tenantId).select('slaConfig currency').lean()
  if (!tenant) { res.json({}); return }

  const now          = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const startOfLast  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

  const [openDeals, wonThis, wonLast] = await Promise.all([
    Deal.find({ tenantId, status: 'open', deletedAt: null }).lean(),
    Deal.find({ tenantId, status: 'won', updatedAt: { $gte: startOfMonth } }).lean(),
    Deal.find({ tenantId, status: 'won', updatedAt: { $gte: startOfLast, $lt: startOfMonth } }).lean(),
  ])

  const openValue    = openDeals.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const wonThisValue = wonThis.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const wonLastValue = wonLast.reduce((s: number, d: any) => s + (d.value ?? 0), 0)
  const winRate      = wonThis.length + openDeals.length > 0
    ? wonThis.length / (wonThis.length + openDeals.length) : 0.3

  res.json({
    currency:    (tenant as any).currency,
    openValue,
    committed:   openValue * winRate * 0.6,
    bestCase:    openValue * winRate,
    wonThisMonth: wonThisValue,
    wonLastMonth: wonLastValue,
    winRate:     Math.round(winRate * 100),
  })
})
