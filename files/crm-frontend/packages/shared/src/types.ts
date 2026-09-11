import type { Role, ActivityType, DealStatus, UserStatus, TenantStatus, AuthProvider, SlaStatus } from './constants'

// ── API response envelope ─────────────────────────────────────────────────────
export interface ApiError {
  error: {
    code:      string
    message:   string
    requestId: string
    details?:  Record<string, string[]>  // validation errors per field
  }
}

// ── JWT payload ───────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId:   string
  tenantId: string
  role:     Role
  iat:      number
  exp:      number
}

// ── Tenant ────────────────────────────────────────────────────────────────────
export interface Stage {
  name:       string
  order:      number
  isTerminal: boolean
}

export interface SlaConfig {
  atRiskWindowDays:       number
  unscheduledGraceHours:  number
  notifyOnOverdue:        boolean
  notifyOwnerDailyDigest: boolean
}

export interface Tenant {
  id:        string          // publicId exposed to frontend
  name:      string
  currency:  string
  timezone:  string
  status:    TenantStatus
  stages:    Stage[]
  slaConfig: SlaConfig
  createdAt: string
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id:           string
  tenantId:     string
  name:         string
  email:        string
  role:         Role
  status:       UserStatus
  authProvider: AuthProvider
  createdAt:    string
}

// ── NextAction (embedded in Deal and Contact) ─────────────────────────────────
export interface NextAction {
  text:    string
  dueDate: string   // ISO 8601 UTC
  setBy:   string   // userId
  setAt:   string   // ISO 8601 UTC
}

// ── Contact ───────────────────────────────────────────────────────────────────
export interface Contact {
  id:         string
  tenantId:   string
  name:       string
  email?:     string
  phone?:     string
  company?:   string
  jobTitle?:  string
  notes?:     string
  nextAction: NextAction | null
  slaStatus:  SlaStatus          // computed live, never stored
  createdAt:  string
  updatedAt:  string
}

// ── Deal ──────────────────────────────────────────────────────────────────────
export interface StageHistoryEntry {
  stage:    string
  movedBy:  string   // userId
  movedAt:  string   // ISO 8601 UTC
}

export interface Deal {
  id:                string
  tenantId:          string
  title:             string
  value:             number
  currency:          string    // from tenant
  stage:             string
  stageHistory:      StageHistoryEntry[]
  expectedCloseDate: string | null
  contactId:         string | null
  ownerId:           string    // userId
  status:            DealStatus
  lostReason:        string | null
  nextAction:        NextAction | null
  slaStatus:         SlaStatus   // computed live
  createdAt:         string
  updatedAt:         string
}

// ── Activity ──────────────────────────────────────────────────────────────────
export interface Activity {
  id:           string
  tenantId:     string
  type:         ActivityType
  text:         string
  authorId:     string
  relatedTo:    { type: 'contact' | 'deal'; id: string }
  // task
  dueDate?:     string | null
  done?:        boolean
  completedAt?: string | null
  assigneeId?:  string | null
  // comment
  mentions?:    string[]
  replyTo?:     string | null
  convertedFrom?: string | null
  convertedTo?:   string | null
  // email
  emailSubject?: string | null
  emailTo?:      string | null
  createdAt:    string
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id:        string
  tenantId:  string
  userId:    string
  type:      string
  message:   string
  relatedTo: { type: string; id: string }
  read:      boolean
  createdAt: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  openPipelineValue: number
  currency:          string
  overdueCount:      number
  dueTodayCount:     number
  wonThisMonth:      number
  dealsByStage:      { stage: string; count: number; value: number }[]
}
