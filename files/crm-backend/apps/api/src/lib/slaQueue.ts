import { Queue } from 'bullmq'
import { redis } from './redis'

export interface SlaJobData {
  type:     'sla:overdue' | 'sla:daily-digest'
  dealId:   string
  tenantId: string
  userId:   string   // deal owner
}

export const SLA_QUEUE_NAME = 'sla'

// Singleton queue used by the API to add/remove jobs
let _queue: Queue<SlaJobData> | null = null

export function getSlaQueue(): Queue<SlaJobData> {
  if (!_queue) {
    _queue = new Queue<SlaJobData>(SLA_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail:     100,
        attempts:         3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    })
  }
  return _queue
}

// Deterministic job ID so scheduling the same deal twice is idempotent
export function slaJobId(dealId: string, type: SlaJobData['type']): string {
  return `${type}:${dealId}`
}
