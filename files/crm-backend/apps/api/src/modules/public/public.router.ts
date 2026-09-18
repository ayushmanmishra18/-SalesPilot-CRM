import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { authRateLimit } from '../../middleware/rateLimit'
import { Lead } from '../../models/Lead'
import { sendMail, leadNotifyEmailHtml } from '../../lib/mailer'
import { config } from '../../config'
import { logger } from '../../lib/logger'

const router = createRouter()

// POST /public/leads — the landing page's "Let's get your team organised" contact form.
// Unauthenticated by design (pre-signup marketing lead), rate-limited to deter spam.
// The lead is always persisted first — the WhatsApp handoff on the frontend is a bonus
// notification channel, not the system of record, so a submission is never lost just
// because a visitor closed WhatsApp without hitting send.
const LeadSchema = z.object({
  name:      z.string().min(1).max(200),
  phone:     z.string().min(1).max(40),
  company:   z.string().max(200).optional(),
  teamSize:  z.string().max(50).optional(),
  challenge: z.string().max(1000).optional(),
})

router.post('/leads', authRateLimit, validate(LeadSchema), async (req: Request, res: Response) => {
  const { name, phone, company, teamSize, challenge } = req.body

  const lead = await Lead.create({
    name, phone,
    company:   company ?? null,
    teamSize:  teamSize ?? null,
    challenge: challenge ?? null,
  })

  sendMail({
    to:      config.leadsNotifyEmail,
    subject: `New SalesPilot lead: ${name}`,
    html:    leadNotifyEmailHtml({ name, phone, company, teamSize, challenge }),
  }).catch(err => logger.warn('lead notification email failed', { err: err.message }))

  res.status(201).json({ ok: true, id: lead.id })
})

export default router
