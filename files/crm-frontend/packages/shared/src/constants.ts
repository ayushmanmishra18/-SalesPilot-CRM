// ── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = ['admin', 'member', 'viewer'] as const
export type Role = (typeof ROLES)[number]

// ── Activity types ────────────────────────────────────────────────────────────
export const ACTIVITY_TYPES = ['note', 'task', 'comment', 'email'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

// ── Deal status ───────────────────────────────────────────────────────────────
export const DEAL_STATUS = ['open', 'won', 'lost'] as const
export type DealStatus = (typeof DEAL_STATUS)[number]

// ── User status ───────────────────────────────────────────────────────────────
export const USER_STATUS = ['active', 'invited'] as const
export type UserStatus = (typeof USER_STATUS)[number]

// ── Tenant status ─────────────────────────────────────────────────────────────
export const TENANT_STATUS = ['active', 'suspended'] as const
export type TenantStatus = (typeof TENANT_STATUS)[number]

// ── Auth providers ────────────────────────────────────────────────────────────
export const AUTH_PROVIDERS = ['password', 'google'] as const
export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

// ── SLA status (computed live, never stored) ──────────────────────────────────
export const SLA_STATUS = ['overdue', 'due_today', 'upcoming', 'on_track', 'unscheduled'] as const
export type SlaStatus = (typeof SLA_STATUS)[number]

// ── Error codes ───────────────────────────────────────────────────────────────
export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS:    'INVALID_CREDENTIALS',
  TOKEN_EXPIRED:          'TOKEN_EXPIRED',
  TOKEN_INVALID:          'TOKEN_INVALID',
  MUST_RESET_PASSWORD:    'MUST_RESET_PASSWORD',
  INVITE_EXPIRED:         'INVITE_EXPIRED',
  INVITE_ALREADY_USED:    'INVITE_ALREADY_USED',
  EMAIL_TAKEN:            'EMAIL_TAKEN',
  INVITE_EMAIL_MISMATCH:  'INVITE_EMAIL_MISMATCH',
  DUPLICATE_INVITE:       'DUPLICATE_INVITE',
  // Authz
  UNAUTHORIZED:           'UNAUTHORIZED',
  FORBIDDEN:              'FORBIDDEN',
  TENANT_SUSPENDED:       'TENANT_SUSPENDED',
  // Resources
  NOT_FOUND:              'NOT_FOUND',
  CONTACT_NOT_FOUND:      'CONTACT_NOT_FOUND',
  DEAL_NOT_FOUND:         'DEAL_NOT_FOUND',
  USER_NOT_FOUND:         'USER_NOT_FOUND',
  // Validation
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  DUPLICATE_REQUEST:      'DUPLICATE_REQUEST',
  // Rate limiting
  RATE_LIMITED:           'RATE_LIMITED',
  // Server
  INTERNAL_ERROR:         'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ── Default pipeline stages ───────────────────────────────────────────────────
export const DEFAULT_STAGES = [
  { name: 'New',         order: 0, isTerminal: false },
  { name: 'Contacted',   order: 1, isTerminal: false },
  { name: 'Proposal',    order: 2, isTerminal: false },
  { name: 'Negotiation', order: 3, isTerminal: false },
  { name: 'Won',         order: 4, isTerminal: true  },
  { name: 'Lost',        order: 5, isTerminal: true  },
]

// ── Default SLA config ────────────────────────────────────────────────────────
export const DEFAULT_SLA_CONFIG = {
  atRiskWindowDays:       3,
  unscheduledGraceHours:  24,
  notifyOnOverdue:        true,
  notifyOwnerDailyDigest: false,
}
