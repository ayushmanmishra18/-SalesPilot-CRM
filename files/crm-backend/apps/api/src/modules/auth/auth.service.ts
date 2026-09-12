import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../../models/User'
import { Tenant } from '../../models/Tenant'
import { RefreshToken } from '../../models/RefreshToken'
import { signAccessToken } from '../../lib/jwt'
import { AppError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { config } from '../../config'
import { sendMail, inviteEmailHtml } from '../../lib/mailer'
import { logger } from '../../lib/logger'

const REFRESH_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function issueTokenPair(user: any, tenant: any, family?: string) {
  const accessToken = signAccessToken({
    userId:    user.publicId,
    tenantId:  tenant.publicId,
    role:      user.role,
    _userId:   user._id.toString(),
    _tenantId: tenant._id.toString(),
  })

  const rawRefresh   = uuidv4()
  const tokenFamily  = family ?? uuidv4()
  const expiresAt    = new Date(Date.now() + REFRESH_EXPIRES_MS)

  await RefreshToken.create({
    tenantId:   tenant._id,
    userId:     user._id,
    tokenHash:  hashToken(rawRefresh),
    family:     tokenFamily,
    expiresAt,
    deviceInfo: '',
  })

  return { accessToken, refreshToken: rawRefresh }
}

// ── Email + password login ────────────────────────────────────────────────────
export async function loginWithPassword(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user || !user.passwordHash) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password', 401)
  }

  if (user.status === 'invited') {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Please accept your invitation first', 401)
  }

  const tenant = await Tenant.findById(user.tenantId)
  if (!tenant) throw new AppError(ERROR_CODES.NOT_FOUND, 'Tenant not found', 404)

  if (tenant.status === 'suspended') {
    throw new AppError(ERROR_CODES.TENANT_SUSPENDED, 'Your workspace is suspended', 403)
  }

  if (user.mustResetPassword) {
    throw new AppError(ERROR_CODES.MUST_RESET_PASSWORD, 'Password reset required', 403)
  }

  return issueTokenPair(user, tenant)
}

// ── Google Sign-In (login only — not tenant creation) ────────────────────────
export async function loginWithGoogle(idToken: string) {
  const client = new OAuth2Client(config.google.clientId)
  let ticket: any
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    })
  } catch {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid Google token', 401)
  }

  const googlePayload = ticket.getPayload()
  if (!googlePayload?.email) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Google token missing email', 401)
  }

  const email = googlePayload.email.toLowerCase()

  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'No account found for this Google email. Contact your admin for an invite.', 401)
  }

  if (user.status === 'invited') {
    // First time Google login — activate the account
    user.authProvider     = 'google'
    user.googleId         = googlePayload.sub
    user.status           = 'active'
    user.inviteToken      = null
    user.inviteExpiresAt  = null
    await user.save()
  } else {
    // Update googleId if not set
    if (!user.googleId) {
      user.googleId    = googlePayload.sub
      user.authProvider = 'google'
      await user.save()
    }
  }

  const tenant = await Tenant.findById(user.tenantId)
  if (!tenant) throw new AppError(ERROR_CODES.NOT_FOUND, 'Tenant not found', 404)
  if (tenant.status === 'suspended') {
    throw new AppError(ERROR_CODES.TENANT_SUSPENDED, 'Your workspace is suspended', 403)
  }

  return issueTokenPair(user, tenant)
}


// ── Refresh token rotation ────────────────────────────────────────────────────
// Note: the refresh token is an opaque random UUID (see issueTokenPair), not a JWT —
// it is validated purely via its hash in the DB, never decoded/verified as a JWT.
export async function refreshTokens(rawRefreshToken: string) {
  const hash     = hashToken(rawRefreshToken)
  const existing = await RefreshToken.findOne({ tokenHash: hash })

  if (!existing) {
    throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Invalid refresh token', 401)
  }

  if (existing.revokedAt) {
    // Reused/rotated-out token — potential theft: revoke the whole family
    await RefreshToken.updateMany({ family: existing.family }, { revokedAt: new Date() })
    throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Refresh token revoked', 401)
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Refresh token expired', 401)
  }

  // Rotate: mark old as used
  await RefreshToken.findByIdAndUpdate(existing._id, { revokedAt: new Date() })

  const user   = await User.findById(existing.userId)
  const tenant = await Tenant.findById(existing.tenantId)
  if (!user || !tenant) throw new AppError(ERROR_CODES.NOT_FOUND, 'User or tenant not found', 404)

  return issueTokenPair(user, tenant, existing.family)
}

// ── Logout — revoke refresh token family ─────────────────────────────────────
export async function logout(rawRefreshToken: string) {
  const hash = hashToken(rawRefreshToken)
  const tok  = await RefreshToken.findOne({ tokenHash: hash })
  if (tok) {
    await RefreshToken.updateMany({ family: tok.family }, { revokedAt: new Date() })
  }
}

// ── Reset password (mustResetPassword flow) ───────────────────────────────────
export async function resetPassword(userId: string, newPassword: string) {
  const hash = await bcrypt.hash(newPassword, 12)
  await User.findOneAndUpdate(
    { publicId: userId },
    { passwordHash: hash, mustResetPassword: false, authProvider: 'password' }
  )
}

// ── Accept invite (password path) ────────────────────────────────────────────
export async function acceptInvitePassword(token: string, password: string) {
  const user = await User.findOne({ inviteToken: token })
  if (!user) {
    throw new AppError(ERROR_CODES.INVITE_ALREADY_USED, 'Invite already used or invalid', 400)
  }
  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
    throw new AppError(ERROR_CODES.INVITE_EXPIRED, 'Invite link has expired', 400)
  }

  const hash = await bcrypt.hash(password, 12)
  user.passwordHash    = hash
  user.authProvider    = 'password'
  user.status          = 'active'
  user.inviteToken     = null
  user.inviteExpiresAt = null
  await user.save()

  const tenant = await Tenant.findById(user.tenantId)
  if (!tenant) throw new AppError(ERROR_CODES.NOT_FOUND, 'Tenant not found', 404)

  return issueTokenPair(user, tenant)
}

// ── Invite user ───────────────────────────────────────────────────────────────
export async function inviteUser(opts: {
  tenantId:    mongoose.Types.ObjectId
  inviterName: string
  companyName: string
  email:       string
  name:        string
  role:        'admin' | 'member' | 'viewer'
  frontendUrl: string
}) {
  const existing = await User.findOne({ email: opts.email.toLowerCase().trim() })
  if (existing) {
    throw new AppError(ERROR_CODES.EMAIL_TAKEN, 'This email already has an account', 409)
  }

  const inviteToken   = uuidv4()
  const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const user = await User.create({
    publicId:        uuidv4(),
    tenantId:        opts.tenantId,
    name:            opts.name,
    email:           opts.email.toLowerCase().trim(),
    role:            opts.role,
    status:          'invited',
    inviteToken,
    inviteExpiresAt: inviteExpires,
  })

  const acceptUrl = `${opts.frontendUrl}/accept-invite?token=${inviteToken}`

  await sendMail({
    to:      opts.email,
    subject: `You've been invited to ${opts.companyName}`,
    html:    inviteEmailHtml({ companyName: opts.companyName, inviterName: opts.inviterName, acceptUrl }),
  }).catch(err => logger.warn('invite email failed', { err: err.message }))

  return { inviteToken, user: { id: user.publicId, email: user.email, name: user.name, role: user.role } }
}
