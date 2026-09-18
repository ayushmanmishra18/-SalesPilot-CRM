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

// ── Branded layout ────────────────────────────────────────────────────────────
// Inlines the app's actual theme tokens (frontend/src/index.css: --green #10B981,
// --green-deep #059669, light-mode --text/--text-2/--border) since email clients
// don't support CSS custom properties — every color here must be a literal hex.
function emailLayout(opts: { preheader?: string; bodyHtml: string }): string {
  return `
    <div style="background:#F0F1F8;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</div>` : ''}
      <div style="max-width:480px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#10B981 0%,#059669 100%);border-radius:14px 14px 0 0;padding:20px 28px">
          <span style="color:#FFFFFF;font-size:15px;font-weight:700;letter-spacing:0.2px">SalesPilot CRM</span>
        </div>
        <div style="background:#FFFFFF;border:1px solid #E2E4EE;border-top:none;border-radius:0 0 14px 14px;padding:28px">
          ${opts.bodyHtml}
        </div>
        <p style="color:#9899B2;font-size:11px;text-align:center;margin-top:20px">
          SalesPilot CRM &middot; automated notification
        </p>
      </div>
    </div>
  `
}

export function inviteEmailHtml(opts: {
  companyName: string
  inviterName: string
  acceptUrl:   string
}): string {
  return emailLayout({
    preheader: `${opts.inviterName} invited you to join ${opts.companyName} on SalesPilot CRM`,
    bodyHtml: `
      <h2 style="color:#0C0C18;font-size:18px;margin:0 0 12px">You've been invited to ${opts.companyName}</h2>
      <p style="color:#52536E;font-size:13.5px;line-height:1.6;margin:0 0 22px">
        ${opts.inviterName} has invited you to join the <strong style="color:#0C0C18">${opts.companyName}</strong> workspace on SalesPilot CRM.
      </p>
      <a href="${opts.acceptUrl}" style="background:linear-gradient(135deg,#10B981 0%,#059669 100%);color:#FFFFFF;padding:12px 26px;border-radius:9px;text-decoration:none;display:inline-block;font-size:13.5px;font-weight:600">
        Accept invitation
      </a>
      <p style="color:#9899B2;font-size:11.5px;margin:20px 0 0">This link expires in 7 days.</p>
    `,
  })
}

export function leadNotifyEmailHtml(opts: {
  name:      string
  phone:     string
  company?:  string | null
  teamSize?: string | null
  challenge?: string | null
}): string {
  const row = (label: string, value?: string | null) => value
    ? `<tr><td style="padding:6px 0;color:#9899B2;font-size:12px;width:110px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#0C0C18;font-size:13px">${value}</td></tr>`
    : ''
  return emailLayout({
    preheader: `New lead: ${opts.name}`,
    bodyHtml: `
      <h2 style="color:#0C0C18;font-size:18px;margin:0 0 4px">New lead from the landing page</h2>
      <p style="color:#9899B2;font-size:12px;margin:0 0 18px">Someone just submitted the "Let's connect" form.</p>
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #E2E4EE;padding-top:4px">
        ${row('Name', opts.name)}
        ${row('Phone', opts.phone)}
        ${row('Company', opts.company)}
        ${row('Team size', opts.teamSize)}
        ${row('Challenge', opts.challenge)}
      </table>
    `,
  })
}
