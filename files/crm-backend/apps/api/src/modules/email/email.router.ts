import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { v4 as uuidv4 } from 'uuid'
import { google } from 'googleapis'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { EmailAccount } from '../../models/EmailAccount'
import { config } from '../../config'
import { z } from 'zod'

const router = createRouter()
router.use(withTenant, requireActiveTenant)

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleGmail.clientId,
    config.googleGmail.clientSecret,
    config.googleGmail.redirectUri,
  )
}

function serializeAccount(a: any) {
  return {
    id:           a.publicId,
    provider:     a.provider,
    emailAddress: a.emailAddress,
    status:       a.status,
    connectedAt:  a.connectedAt,
    lastUsedAt:   a.lastUsedAt,
  }
}

// GET /email/accounts  — list connected email accounts for the user
router.get('/accounts', async (req: Request, res: Response) => {
  const accounts = await EmailAccount.find({
    tenantId: req.auth!._tenantId,
    userId:   req.auth!._userId,
  }).lean()
  res.json({ accounts: accounts.map(serializeAccount) })
})

// GET /email/connect/google  — returns the OAuth URL for the frontend to redirect to
router.get('/connect/google', requireRole('admin', 'member'),
  async (req: Request, res: Response) => {
    if (!config.googleGmail.clientId) {
      sendError(res, 503, ERROR_CODES.INTERNAL_ERROR, 'Gmail integration is not configured. Set GOOGLE_GMAIL_CLIENT_ID in .env')
      return
    }

    const oauth2Client = getOAuth2Client()
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt:      'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    })
    res.json({ url })
  }
)

// POST /email/connect/google/callback  — exchange auth code for refresh token
router.post('/connect/google/callback', requireRole('admin', 'member'),
  validate(z.object({ code: z.string().min(1) })),
  async (req: Request, res: Response) => {
    if (!config.googleGmail.clientId) {
      sendError(res, 503, ERROR_CODES.INTERNAL_ERROR, 'Gmail integration not configured')
      return
    }

    const oauth2Client = getOAuth2Client()

    let tokens: any
    try {
      const response = await oauth2Client.getToken(req.body.code)
      tokens = response.tokens
    } catch {
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Invalid or expired OAuth code')
      return
    }

    if (!tokens.refresh_token) {
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'No refresh token received. Revoke app access in Google and try again.')
      return
    }

    // Get the email address of the connected account
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    let emailAddress = ''
    try {
      const info = await oauth2.userinfo.get()
      emailAddress = info.data.email ?? ''
    } catch {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Could not retrieve Gmail address')
      return
    }

    // Upsert — one account per user per tenant
    await EmailAccount.findOneAndUpdate(
      { tenantId: req.auth!._tenantId, userId: req.auth!._userId },
      {
        publicId:          uuidv4(),
        tenantId:          req.auth!._tenantId,
        userId:            req.auth!._userId,
        provider:          'google',
        emailAddress,
        oauthRefreshToken: tokens.refresh_token,
        connectedAt:       new Date(),
        status:            'active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ ok: true, emailAddress })
  }
)

// POST /email/send  — send a one-off email (not tied to Activity creation — standalone endpoint)
router.post('/send', requireRole('admin', 'member'),
  validate(z.object({
    to:      z.string().email(),
    subject: z.string().min(1).max(200),
    body:    z.string().min(1).max(10000),
  })),
  async (req: Request, res: Response) => {
    const account = await EmailAccount.findOne({
      tenantId: req.auth!._tenantId,
      userId:   req.auth!._userId,
      status:   'active',
    })
    if (!account) {
      sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'No email account connected. Connect Gmail in Settings first.')
      return
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({ refresh_token: account.oauthRefreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const raw = makeRawEmail(account.emailAddress, req.body.to, req.body.subject, req.body.body)
    try {
      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
      account.lastUsedAt = new Date()
      await account.save()
      res.json({ ok: true })
    } catch (err: any) {
      if (err.code === 401) {
        await EmailAccount.findByIdAndUpdate(account._id, { status: 'revoked' })
        sendError(res, 401, ERROR_CODES.TOKEN_INVALID, 'Gmail authorization revoked. Reconnect in Settings.')
        return
      }
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to send email')
    }
  }
)

// DELETE /email/accounts/:id  — disconnect an email account
router.delete('/accounts/:id', requireRole('admin', 'member'), async (req: Request, res: Response) => {
  const account = await EmailAccount.findOneAndDelete({
    publicId: req.params.id,
    tenantId: req.auth!._tenantId,
    userId:   req.auth!._userId,
  })
  if (!account) { notFound(res, 'Email account'); return }
  res.json({ ok: true })
})

function makeRawEmail(from: string, to: string, subject: string, body: string): string {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body,
  ].join('\r\n')
  return Buffer.from(email).toString('base64url')
}

export default router
