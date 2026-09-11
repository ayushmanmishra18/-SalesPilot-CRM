import { Router, Request, Response } from 'express'
import { withTenant, requireActiveTenant } from '../../middleware/auth'
import { notFound } from '../../lib/errors'
import { Notification } from '../../models/Notification'

const router = Router()
router.use(withTenant, requireActiveTenant)

function serialize(n: any) {
  return {
    id:        n.publicId,
    type:      n.type,
    message:   n.message,
    relatedTo: n.relatedTo,
    read:      n.read,
    createdAt: n.createdAt,
  }
}

// GET /notifications
router.get('/', async (req: Request, res: Response) => {
  const notifications = await Notification.find({
    tenantId: req.auth!._tenantId,
    userId:   req.auth!._userId,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  const unreadCount = notifications.filter(n => !n.read).length

  res.json({ notifications: notifications.map(serialize), unreadCount })
})

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req: Request, res: Response) => {
  const notif = await Notification.findOneAndUpdate(
    { publicId: req.params.id, tenantId: req.auth!._tenantId, userId: req.auth!._userId },
    { read: true },
    { new: true }
  ).lean()
  if (!notif) { notFound(res, 'Notification'); return }
  res.json({ notification: serialize(notif) })
})

// PATCH /notifications/read-all
router.patch('/read-all', async (req: Request, res: Response) => {
  await Notification.updateMany(
    { tenantId: req.auth!._tenantId, userId: req.auth!._userId, read: false },
    { read: true }
  )
  res.json({ ok: true })
})

export default router
