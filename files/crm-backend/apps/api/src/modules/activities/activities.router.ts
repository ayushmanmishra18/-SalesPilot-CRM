import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { Server as IOServer } from 'socket.io'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { idempotency } from '../../middleware/idempotency'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import { ERROR_CODES, CreateActivitySchema, ConvertToTaskSchema } from '@crm/shared'
import { Activity } from '../../models/Activity'
import { User } from '../../models/User'
import { createNotification } from '../../lib/notify'
import { EmailAccount } from '../../models/EmailAccount'
import { google } from 'googleapis'
import { config } from '../../config'

const router = Router()
router.use(withTenant, requireActiveTenant)

let _io: IOServer | null = null
export function setIo(io: IOServer) { _io = io }

function serializeActivity(a: any) {
  return {
    id:           a.publicId,
    type:         a.type,
    text:         a.text,
    authorId:     a.authorId,
    relatedTo:    a.relatedTo,
    dueDate:      a.dueDate,
    done:         a.done,
    completedAt:  a.completedAt,
    assigneeId:   a.assigneeId,
    mentions:     a.mentions,
    replyTo:      a.replyTo,
    convertedFrom:a.convertedFrom,
    convertedTo:  a.convertedTo,
    emailSubject: a.emailSubject,
    emailTo:      a.emailTo,
    createdAt:    a.createdAt,
  }
}

// Resolve relatedTo from query string: "deal:publicId" or "contact:publicId"
function parseRelatedTo(str: string) {
  const [type, id] = str.split(':')
  return { type, id }
}

// GET /activities?relatedTo=deal:abc&page=1
router.get('/', async (req: Request, res: Response) => {
  const { relatedTo, page = '1' } = req.query as any
  if (!relatedTo) { sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'relatedTo is required'); return }

  const parsed  = parseRelatedTo(relatedTo)
  const pageNum = Math.max(1, parseInt(page, 10))
  const limit   = 50

  // We need to find by publicId of the related record, but Activity stores the Mongo _id
  // So we just filter by the publicId in relatedTo.id and match by type
  const activities = await Activity.find({
    tenantId:            req.auth!._tenantId,
    'relatedTo.type':    parsed.type,
  })
  .sort({ createdAt: -1 })
  .lean()

  // Filter by publicId match (relatedTo.id is stored as ObjectId — need lookup)
  // For simplicity we store publicId in relatedTo.id as string — see POST handler
  const filtered = activities.filter((a: any) => a.relatedTo.id.toString() === parsed.id)
    .slice((pageNum - 1) * limit, pageNum * limit)

  res.json({ activities: filtered.map(serializeActivity) })
})

// POST /activities
router.post('/', requireRole('admin', 'member'), idempotency, validate(CreateActivitySchema),
  async (req: Request, res: Response) => {
    const body = req.body as any

    // For email type — actually send via Gmail if account connected
    if (body.type === 'email') {
      const emailAccount = await EmailAccount.findOne({
        tenantId: req.auth!._tenantId,
        userId:   req.auth!._userId,
        status:   'active',
      })
      if (emailAccount && emailAccount.provider === 'google') {
        try {
          const oauth2Client = new google.auth.OAuth2(
            config.googleGmail.clientId,
            config.googleGmail.clientSecret,
            config.googleGmail.redirectUri,
          )
          oauth2Client.setCredentials({ refresh_token: emailAccount.oauthRefreshToken })

          const gmail  = google.gmail({ version: 'v1', auth: oauth2Client })
          const raw    = makeRawEmail(emailAccount.emailAddress, body.emailTo, body.emailSubject, body.text)
          await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })

          emailAccount.lastUsedAt = new Date()
          await emailAccount.save()
        } catch (err: any) {
          // Log but don't block — still log the activity
        }
      }
    }

    // Store relatedTo.id as the publicId string (not ObjectId) for easy query
    const activity = await Activity.create({
      publicId:  uuidv4(),
      tenantId:  req.auth!._tenantId,
      type:      body.type,
      text:      body.text,
      authorId:  req.auth!._userId,
      relatedTo: { type: body.relatedTo.type, id: body.relatedTo.id },
      // task
      dueDate:   body.dueDate    ? new Date(body.dueDate) : null,
      assigneeId:body.assigneeId ? new mongoose.Types.ObjectId(body.assigneeId) : null,
      // comment
      mentions:  (body.mentions ?? []).map((m: string) => {
        try { return new mongoose.Types.ObjectId(m) } catch { return null }
      }).filter(Boolean),
      replyTo:   body.replyTo ? new mongoose.Types.ObjectId(body.replyTo) : null,
      // email
      emailSubject: body.emailSubject ?? null,
      emailTo:      body.emailTo      ?? null,
    })

    const serialized = serializeActivity(activity.toObject())

    // Emit live to record room
    _io?.to(`record:${body.relatedTo.type}:${body.relatedTo.id}`).emit('activity:new', {
      relatedTo: body.relatedTo,
      activity:  serialized,
    })

    // Notify assignee on task creation
    if (body.type === 'task' && body.assigneeId && body.assigneeId !== req.auth!.userId) {
      try {
        const assignee = await User.findOne({ publicId: body.assigneeId }).lean()
        if (assignee) {
          await createNotification({
            tenantId:  req.auth!._tenantId,
            userId:    assignee._id as mongoose.Types.ObjectId,
            type:      'task_assigned',
            message:   `You have a new task: ${body.text}`,
            relatedTo: { type: body.relatedTo.type, id: new mongoose.Types.ObjectId(body.relatedTo.id) },
          })
        }
      } catch {}
    }

    // Notify mentions
    if (body.type === 'comment' && (body.mentions ?? []).length > 0) {
      for (const mentionPublicId of body.mentions) {
        try {
          const mentioned = await User.findOne({ publicId: mentionPublicId }).lean()
          if (mentioned && mentioned.publicId !== req.auth!.userId) {
            await createNotification({
              tenantId:  req.auth!._tenantId,
              userId:    mentioned._id as mongoose.Types.ObjectId,
              type:      'mention',
              message:   `${req.auth!.userId} mentioned you in a comment`,
              relatedTo: { type: body.relatedTo.type, id: new mongoose.Types.ObjectId(body.relatedTo.id) },
            })
          }
        } catch {}
      }
    }

    res.status(201).json({ activity: serialized })
  }
)

// POST /activities/:id/convert-to-task
router.post('/:id/convert-to-task', requireRole('admin', 'member'), validate(ConvertToTaskSchema),
  async (req: Request, res: Response) => {
    const source = await Activity.findOne({
      publicId: req.params.id,
      tenantId: req.auth!._tenantId,
    }).lean()
    if (!source) { notFound(res, 'Activity'); return }
    if (source.convertedTo) {
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Already converted to a task')
      return
    }

    const task = await Activity.create({
      publicId:     uuidv4(),
      tenantId:     req.auth!._tenantId,
      type:         'task',
      text:         req.body.text,
      authorId:     req.auth!._userId,
      relatedTo:    source.relatedTo,
      dueDate:      new Date(req.body.dueDate),
      assigneeId:   req.body.assigneeId ? new mongoose.Types.ObjectId(req.body.assigneeId) : null,
      convertedFrom:source._id,
    })

    // Mark source as converted
    await Activity.findByIdAndUpdate(source._id, { convertedTo: task._id })

    res.status(201).json({ task: serializeActivity(task.toObject()) })
  }
)

// PATCH /activities/:id/complete
router.patch('/:id/complete', requireRole('admin', 'member'), async (req: Request, res: Response) => {
  const activity = await Activity.findOneAndUpdate(
    { publicId: req.params.id, tenantId: req.auth!._tenantId, type: 'task', done: false },
    { done: true, completedAt: new Date() },
    { new: true }
  ).lean()
  if (!activity) { notFound(res, 'Task'); return }
  res.json({ activity: serializeActivity(activity) })
})

// Helpers
function makeRawEmail(from: string, to: string, subject: string, body: string): string {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body,
  ].join('\n')
  return Buffer.from(email).toString('base64url')
}

export default router
