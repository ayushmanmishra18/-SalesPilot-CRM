import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import Redis from 'ioredis'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, transports, format } from 'winston'

// ── Logger ────────────────────────────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
})

// ── Config (reads from same .env) ─────────────────────────────────────────────
const MONGODB_URI  = process.env['MONGODB_URI']  ?? 'mongodb://localhost:27017/crm'
const REDIS_URL    = process.env['REDIS_URL']    ?? 'redis://localhost:6379'
const SLA_QUEUE    = 'sla'

// ── Inline models (worker is a separate process — import directly) ─────────────
// We define minimal schemas inline to avoid depending on the API's full model files.

const DealSchema = new mongoose.Schema({
  publicId:   String,
  tenantId:   mongoose.Schema.Types.ObjectId,
  title:      String,
  ownerId:    mongoose.Schema.Types.ObjectId,
  status:     String,
  nextAction: {
    text:    String,
    dueDate: Date,
    setBy:   mongoose.Schema.Types.ObjectId,
    setAt:   Date,
  },
  deletedAt:  Date,
}, { timestamps: true })

const UserSchema = new mongoose.Schema({
  publicId: String,
  tenantId: mongoose.Schema.Types.ObjectId,
  name:     String,
  email:    String,
  role:     String,
  status:   String,
})

const NotificationSchema = new mongoose.Schema({
  publicId:  { type: String, required: true, unique: true },
  tenantId:  mongoose.Schema.Types.ObjectId,
  userId:    mongoose.Schema.Types.ObjectId,
  type:      String,
  message:   String,
  relatedTo: { type: { type: String }, id: mongoose.Schema.Types.ObjectId },
  read:      { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } })

NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 })

const Deal         = mongoose.model('Deal',         DealSchema)
const User         = mongoose.model('User',         UserSchema)
const Notification = mongoose.model('Notification', NotificationSchema)

// ── Job data type ──────────────────────────────────────────────────────────────
interface SlaJobData {
  type:     'sla:overdue' | 'sla:daily-digest'
  dealId:   string
  tenantId: string
  userId:   string
}

// ── Processor ─────────────────────────────────────────────────────────────────
async function processJob(job: Job<SlaJobData>): Promise<void> {
  const { type, dealId, tenantId, userId } = job.data
  logger.info('processing sla job', { type, dealId, jobId: job.id })

  if (type === 'sla:overdue') {
    await handleOverdue(dealId, tenantId, userId)
  } else if (type === 'sla:daily-digest') {
    await handleDailyDigest(tenantId)
  }
}

async function handleOverdue(dealId: string, tenantId: string, ownerId: string): Promise<void> {
  // Re-check the deal is still open and nextAction is still overdue
  const deal = await Deal.findOne({ publicId: dealId, status: 'open', deletedAt: null }).lean()
  if (!deal) {
    logger.info('sla:overdue — deal no longer open, skipping', { dealId })
    return
  }

  const nextAction = (deal as any).nextAction
  if (!nextAction?.dueDate || new Date(nextAction.dueDate) > new Date()) {
    logger.info('sla:overdue — nextAction no longer overdue, skipping', { dealId })
    return
  }

  // Find the deal owner by their publicId
  const owner = await User.findOne({ publicId: ownerId }).lean()
  if (!owner) return

  const tenantObjId = (deal as any).tenantId

  // Create notification — avoid duplicate by checking if one exists recently
  const recent = await Notification.findOne({
    tenantId: tenantObjId,
    userId:   owner._id,
    type:     'sla_overdue',
    'relatedTo.id': deal._id,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).lean()

  if (recent) {
    logger.info('sla:overdue — notification already sent in last 24h', { dealId })
    return
  }

  await Notification.create({
    publicId:  uuidv4(),
    tenantId:  tenantObjId,
    userId:    owner._id,
    type:      'sla_overdue',
    message:   `Follow-up overdue on deal: ${(deal as any).title}`,
    relatedTo: { type: 'deal', id: deal._id },
    read:      false,
  })

  logger.info('sla:overdue notification created', { dealId, ownerId })
}

async function handleDailyDigest(tenantId: string): Promise<void> {
  // Find all admins and members with overdue deals they own
  const now = new Date()

  const overdueDeals = await Deal.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    status:   'open',
    deletedAt: null,
    'nextAction.dueDate': { $lt: now },
  }).lean()

  if (overdueDeals.length === 0) return

  // Group by ownerId
  const byOwner: Record<string, any[]> = {}
  for (const d of overdueDeals) {
    const key = (d as any).ownerId.toString()
    if (!byOwner[key]) byOwner[key] = []
    byOwner[key].push(d)
  }

  for (const [ownerIdStr, deals] of Object.entries(byOwner)) {
    const owner = await User.findById(ownerIdStr).lean()
    if (!owner) continue

    const count = deals.length
    await Notification.create({
      publicId:  uuidv4(),
      tenantId:  new mongoose.Types.ObjectId(tenantId),
      userId:    (owner as any)._id,
      type:      'daily_digest',
      message:   `Daily digest: you have ${count} overdue follow-up${count > 1 ? 's' : ''} to action`,
      relatedTo: { type: 'deal', id: (deals[0] as any)._id },
      read:      false,
    })
  }

  logger.info('daily digest notifications sent', { tenantId, ownerCount: Object.keys(byOwner).length })
}

// ── Boot ───────────────────────────────────────────────────────────────────────
async function main() {
  // Connect MongoDB
  await mongoose.connect(MONGODB_URI)
  logger.info('Worker MongoDB connected')

  // Redis connection for BullMQ worker
  const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  })

  const worker = new Worker<SlaJobData>(SLA_QUEUE, processJob, {
    connection,
    concurrency: 5,
  })

  worker.on('completed', (job) => {
    logger.info('job completed', { jobId: job.id, type: job.data.type })
  })

  worker.on('failed', (job, err) => {
    logger.error('job failed', { jobId: job?.id, type: job?.data?.type, err: err.message })
  })

  worker.on('error', (err) => {
    logger.error('worker error', { err: err.message })
  })

  logger.info('SLA worker started', { queue: SLA_QUEUE })

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM — closing worker')
    await worker.close()
    await mongoose.disconnect()
    process.exit(0)
  })
}

main().catch(err => {
  console.error('Worker fatal error:', err)
  process.exit(1)
})
