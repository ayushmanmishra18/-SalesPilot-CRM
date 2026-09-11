export type SlaStatus = 'overdue' | 'due_today' | 'upcoming' | 'on_track' | 'unscheduled'

export const SLA_LABELS: Record<SlaStatus, string> = {
  overdue:     'Overdue',
  due_today:   'Due today',
  upcoming:    'Upcoming',
  on_track:    'On track',
  unscheduled: 'Unscheduled',
}

export const SLA_COLORS: Record<SlaStatus, string> = {
  overdue:     '#E4483F',
  due_today:   '#F5A524',
  upcoming:    '#4C8BF5',
  on_track:    '#2FAE60',
  unscheduled: '#98A2B3',
}

export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export function formatDate(iso: string | null | undefined, tz = 'Asia/Kolkata') {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tz }).format(new Date(iso))
}

export function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return formatDate(iso)
}
