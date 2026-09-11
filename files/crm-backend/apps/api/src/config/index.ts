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
    accessSecret:    optional('JWT_ACCESS_SECRET',  'dev-access-secret-change-in-prod'),
    refreshSecret:   optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-prod'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN',  '15m'),
    refreshExpiresIn:optional('JWT_REFRESH_EXPIRES_IN', '30d'),
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

  microsoft: {
    tenantId: optional('MICROSOFT_TENANT_ID', 'common'),
    clientId: optional('MICROSOFT_CLIENT_ID', ''),
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.gmail.com'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('EMAIL_FROM', 'SalesPilot CRM <no-reply@example.com>'),
  },
}
