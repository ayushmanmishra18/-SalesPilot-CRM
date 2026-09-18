import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  port:        parseInt(optional('PORT', '3001'), 10),
  nodeEnv:     optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  mongoUri: optional('MONGODB_URI', 'mongodb://localhost:27017/crm'),
  redisUrl: optional('REDIS_URL',   'redis://localhost:6379'),

  jwt: {
    // Required, not optional-with-a-fallback: a hardcoded default secret sitting in the
    // source code means anyone who's ever read this codebase could forge a valid token
    // for any user if the real env var is ever missing in a deployed environment. Failing
    // to start is far safer than silently signing tokens with a known secret.
    //
    // Note: there's no separate "refresh" secret here — refresh tokens are opaque random
    // UUIDs validated by their hash in the DB (see auth.service.ts), never JWT-signed, so
    // there's nothing for a refresh-specific secret to do.
    accessSecret:    required('JWT_ACCESS_SECRET'),
    // The super-admin token gets its own independent secret rather than being derived
    // from accessSecret (e.g. accessSecret + '-admin') — deriving it that way means a
    // leaked user-token secret hands over the admin secret for free.
    adminSecret:     required('JWT_ADMIN_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN',  '15m'),
  },

  superAdmin: {
    email:    optional('SUPER_ADMIN_EMAIL',    'superadmin@crm.internal'),
    password: optional('SUPER_ADMIN_PASSWORD', 'ChangeMe123!'),
  },

  google: {
    clientId: optional('GOOGLE_CLIENT_ID', ''),
  },

  googleGmail: {
    clientId:     optional('GOOGLE_GMAIL_CLIENT_ID',     ''),
    clientSecret: optional('GOOGLE_GMAIL_CLIENT_SECRET', ''),
    redirectUri:  optional('GOOGLE_GMAIL_REDIRECT_URI',  'http://localhost:5173/settings'),
  },

  // Only `from` is still used — email is sent via Resend's HTTPS API (see lib/mailer.ts),
  // not SMTP, since Render blocks outbound SMTP ports. host/port/user/pass are legacy.
  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'SalesPilot CRM <no-reply@example.com>'),
  },

  resendApiKey: optional('RESEND_API_KEY', ''),

  // Where the landing page's "Let's connect" form notifies on a new lead (best-effort —
  // the lead is always persisted to the DB regardless of whether this email send succeeds).
  leadsNotifyEmail: optional('LEADS_NOTIFY_EMAIL', 'ayushmanmishraji1@gmail.com'),
}
