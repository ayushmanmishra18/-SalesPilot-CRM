import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { notFound } from '../../lib/errors'
import { UpdateTenantSchema, UpdateStagesSchema } from '@crm/shared'
import { Tenant } from '../../models/Tenant'
import { z } from 'zod'

const router = createRouter()
router.use(withTenant, requireActiveTenant)

// GET /settings  — returns full tenant config (used by Settings page + pipeline kanban)
router.get('/', async (req: Request, res: Response) => {
  const tenant = await Tenant.findById(req.auth!._tenantId).lean()
  if (!tenant) { notFound(res, 'Tenant'); return }

  res.json({
    tenant: {
      id:        tenant.publicId,
      name:      tenant.name,
      currency:  tenant.currency,
      timezone:  tenant.timezone,
      status:    tenant.status,
      stages:    tenant.stages,
      slaConfig: tenant.slaConfig,
      createdAt: tenant.createdAt,
    },
  })
})

// PATCH /settings  — update name, currency, timezone  (admin only)
router.patch('/', requireRole('admin'), validate(UpdateTenantSchema),
  async (req: Request, res: Response) => {
    const tenant = await Tenant.findByIdAndUpdate(
      req.auth!._tenantId,
      { ...req.body },
      { new: true }
    ).lean()
    if (!tenant) { notFound(res, 'Tenant'); return }

    res.json({
      tenant: {
        id:        tenant.publicId,
        name:      tenant.name,
        currency:  tenant.currency,
        timezone:  tenant.timezone,
        status:    tenant.status,
        stages:    tenant.stages,
        slaConfig: tenant.slaConfig,
      },
    })
  }
)

// PATCH /settings/stages  — replace stage list  (admin only)
router.patch('/stages', requireRole('admin'), validate(UpdateStagesSchema),
  async (req: Request, res: Response) => {
    const tenant = await Tenant.findByIdAndUpdate(
      req.auth!._tenantId,
      { stages: req.body.stages },
      { new: true }
    ).lean()
    if (!tenant) { notFound(res, 'Tenant'); return }
    res.json({ stages: tenant.stages })
  }
)

// PATCH /settings/sla  — update SLA thresholds  (admin only)
router.patch('/sla', requireRole('admin'), validate(z.object({
  atRiskWindowDays:       z.number().int().min(1).max(30).optional(),
  unscheduledGraceHours:  z.number().int().min(0).max(168).optional(),
  notifyOnOverdue:        z.boolean().optional(),
  notifyOwnerDailyDigest: z.boolean().optional(),
})), async (req: Request, res: Response) => {
  const updates: Record<string, any> = {}
  for (const [k, v] of Object.entries(req.body)) {
    updates[`slaConfig.${k}`] = v
  }
  const tenant = await Tenant.findByIdAndUpdate(
    req.auth!._tenantId,
    { $set: updates },
    { new: true }
  ).lean()
  if (!tenant) { notFound(res, 'Tenant'); return }
  res.json({ slaConfig: tenant.slaConfig })
})

export default router
