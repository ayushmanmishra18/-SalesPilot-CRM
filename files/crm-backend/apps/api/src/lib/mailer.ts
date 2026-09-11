import nodemailer from 'nodemailer'
import { config } from '../config'
import { logger } from './logger'

const transporter = nodemailer.createTransport({
  host:   config.smtp.host,
  port:   config.smtp.port,
  secure: config.smtp.port === 465,
  auth:   { user: config.smtp.user, pass: config.smtp.pass },
})

export async function sendMail(opts: {
  to:      string
  subject: string
  html:    string
}): Promise<void> {
  if (!config.smtp.user) {
    // Dev mode — just log
    logger.info('[mailer] skipping send (SMTP not configured)', { to: opts.to, subject: opts.subject })
    return
  }
  await transporter.sendMail({ from: config.smtp.from, ...opts })
}

export function inviteEmailHtml(opts: {
  companyName: string
  inviterName: string
  acceptUrl:   string
}): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2>You've been invited to ${opts.companyName}</h2>
      <p>${opts.inviterName} has invited you to join the ${opts.companyName} workspace on SalesPilot CRM.</p>
      <p><a href="${opts.acceptUrl}" style="background:#10B981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accept invitation</a></p>
      <p style="color:#888;font-size:12px">This link expires in 7 days.</p>
    </div>
  `
}
