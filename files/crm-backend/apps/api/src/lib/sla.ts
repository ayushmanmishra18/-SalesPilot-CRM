import { SlaStatus } from '@crm/shared'

interface SlaConfigLike {
  atRiskWindowDays:      number
  unscheduledGraceHours: number
}

export function computeSlaStatus(
  nextAction: { dueDate: string | Date } | null | undefined,
  slaConfig:  SlaConfigLike,
  referenceNow = new Date(),
): SlaStatus {
  if (!nextAction?.dueDate) return 'unscheduled'

  const due  = new Date(nextAction.dueDate)
  const now  = referenceNow
  const ms   = due.getTime() - now.getTime()
  const days = ms / 86_400_000

  if (ms < 0)     return 'overdue'
  if (days <= 0)  return 'due_today'  // same calendar day
  if (days <= slaConfig.atRiskWindowDays) return 'upcoming'
  return 'on_track'
}

// Determine if today (UTC) matches the due date calendar day
export function isDueToday(dueDate: string | Date, now = new Date()): boolean {
  const d = new Date(dueDate)
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth()    === now.getUTCMonth()    &&
    d.getUTCDate()     === now.getUTCDate()
  )
}
