import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun, Moon, Mail, ChevronDown, Check,
  KanbanSquare, Clock, Smartphone, History, BarChart3, Users2,
  MessageSquare, Send, FolderOpen, Trophy, BellRing, ShieldCheck,
  Zap, Lock, Headset, TrendingUp, MapPin,
} from 'lucide-react'
import { useThemeStore } from '../../store/theme'

/* ─── tiny helpers ─────────────────────────────────────────────── */
function Pill({ children, color = 'green' }: { children: React.ReactNode; color?: 'green' | 'amber' | 'red' | 'blue' | 'muted' }) {
  const cols = {
    green: { bg: 'rgba(16,185,129,.12)', color: '#10B981', border: 'rgba(16,185,129,.3)' },
    amber: { bg: 'rgba(245,165,36,.12)',  color: '#F5A524', border: 'rgba(245,165,36,.3)' },
    red:   { bg: 'rgba(228,72,63,.12)',   color: '#E4483F', border: 'rgba(228,72,63,.3)'  },
    blue:  { bg: 'rgba(76,139,245,.12)',  color: '#4C8BF5', border: 'rgba(76,139,245,.3)' },
    muted: { bg: 'rgba(123,122,149,.1)',  color: '#7B7A95', border: 'rgba(123,122,149,.2)' },
  }
  const c = cols[color]
  return (
    <span style={{
      display: 'inline-block', fontSize: 10, padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

/* ─── pipeline mockup ──────────────────────────────────────────── */
function PipelineMock() {
  return (
    <div style={{ background: '#0E0E17', borderRadius: 20, padding: 20, border: '1px solid #1E1E28' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          {
            title: 'New Leads', count: '2', color: '#7B7A95',
            cards: [
              { name: 'Acme Corp', val: '₹1,20,000', pill: <Pill color="amber">Due today</Pill> },
              { name: 'Sara Exports', val: '₹85,000', pill: <Pill color="muted">Unscheduled</Pill> },
            ]
          },
          {
            title: 'Proposal Sent', count: '1', color: '#7B7A95',
            cards: [
              { name: 'Widget Co', val: '₹2,40,000', pill: <Pill color="red">Overdue</Pill> },
            ]
          },
          {
            title: 'Won ✓', count: '1', color: '#10B981',
            cards: [
              { name: 'Delta Inc', val: '₹1,80,000', pill: <Pill color="green">Closed</Pill> },
            ],
            won: true,
          },
        ].map(col => (
          <div key={col.title} style={{ background: '#13131E', borderRadius: 12, padding: 10, border: col.won ? '1px solid rgba(16,185,129,.3)' : '1px solid #1E1E28' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 9, fontWeight: 700, color: col.color }}>
              <span>{col.title}</span><span>{col.count}</span>
            </div>
            {col.cards.map(card => (
              <div key={card.name} style={{ background: '#09090F', borderRadius: 9, padding: 9, marginBottom: 6, border: col.won ? '1px solid rgba(16,185,129,.2)' : '1px solid #1E1E28' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#EDEDF4', marginBottom: 3 }}>{card.name}</div>
                <div style={{ fontSize: 10, color: '#10B981', fontWeight: 600, marginBottom: 6 }}>{card.val}</div>
                {card.pill}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── dashboard mockup ─────────────────────────────────────────── */
function DashMock() {
  return (
    <div style={{ background: '#0E0E17', borderRadius: 20, padding: 20, border: '1px solid #1E1E28' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#EDEDF4', marginBottom: 4 }}>Good morning, Rahul ☀</div>
      <div style={{ fontSize: 9.5, color: '#E4483F', fontWeight: 600, marginBottom: 12 }}>3 follow-ups need your attention today</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 12 }}>
        {[
          { l: 'Open Pipeline', v: '₹18.4L', c: '#EDEDF4' },
          { l: 'Overdue', v: '3', c: '#E4483F' },
          { l: 'Won this month', v: '₹4.2L', c: '#10B981' },
        ].map(s => (
          <div key={s.l} style={{ background: '#13131E', borderRadius: 10, padding: 10, border: '1px solid #1E1E28' }}>
            <div style={{ fontSize: 8, color: '#7B7A95', marginBottom: 5 }}>{s.l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#13131E', borderRadius: 10, padding: 12, border: '1px solid #1E1E28' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#7B7A95', marginBottom: 8 }}>Today's follow-ups</div>
        {[
          { name: 'Acme Corp — Call Rajesh', pill: <Pill color="red">Overdue</Pill> },
          { name: 'Widget Co — Send proposal', pill: <Pill color="amber">Due today</Pill> },
          { name: 'Northwind — Demo follow-up', pill: <Pill color="blue">Upcoming</Pill> },
        ].map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderTop: i ? '1px solid #1E1E28' : 'none' }}>
            <span style={{ fontSize: 9.5, color: '#EDEDF4' }}>{f.name}</span>
            {f.pill}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── activity feed mockup ─────────────────────────────────────── */
function ActivityMock() {
  return (
    <div style={{ background: '#0E0E17', borderRadius: 20, padding: 20, border: '1px solid #1E1E28' }}>
      {[
        { icon: '📝', type: 'Note', text: 'Called Rajesh — budget approved, needs CFO sign-off by Friday. Very positive call.', time: 'Priya · 2 hrs ago', bg: 'rgba(16,185,129,.12)' },
        { icon: '💬', type: 'Comment', text: '@Rahul — should we offer 5% discount to close this week?', time: 'Tom · 1 hr ago', bg: 'rgba(76,139,245,.12)' },
        { icon: '📧', type: 'Email sent', text: 'Revised proposal with discount — sent to rajesh@acmecorp.in', time: 'Rahul · 30 min ago', bg: 'rgba(245,165,36,.12)' },
        { icon: '✅', type: 'Task done', text: 'Prepared pricing document — marked complete', time: 'Priya · 20 min ago', bg: 'rgba(47,174,96,.12)' },
      ].map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: '#7B7A95', marginBottom: 3, letterSpacing: .5 }}>{a.type.toUpperCase()}</div>
            <div style={{ fontSize: 10.5, color: '#EDEDF4', lineHeight: 1.4, marginBottom: 2 }}>{a.text}</div>
            <div style={{ fontSize: 8, color: '#7B7A95' }}>{a.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── analytics mockup ─────────────────────────────────────────── */
function AnalyticsMock() {
  const bars = [
    { stage: 'New → Contacted', pct: 72, color: '#10B981' },
    { stage: 'Contacted → Proposal', pct: 48, color: '#F5A524' },
    { stage: 'Proposal → Won', pct: 31, color: '#4C8BF5' },
  ]
  return (
    <div style={{ background: '#0E0E17', borderRadius: 20, padding: 20, border: '1px solid #1E1E28' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#EDEDF4', marginBottom: 4 }}>Pipeline conversion rates</div>
      <div style={{ fontSize: 9, color: '#7B7A95', marginBottom: 16 }}>Where are you winning and losing deals?</div>
      {bars.map(b => (
        <div key={b.stage} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10.5, color: '#EDEDF4' }}>
            <span>{b.stage}</span>
            <span style={{ color: b.color, fontWeight: 700 }}>{b.pct}%</span>
          </div>
          <div style={{ height: 6, background: '#1E1E28', borderRadius: 3 }}>
            <div style={{ height: 6, borderRadius: 3, background: b.color, width: `${b.pct}%`, transition: 'width 1s ease' }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, background: '#13131E', borderRadius: 10, padding: 12, border: '1px solid #1E1E28' }}>
        <div style={{ fontSize: 9.5, color: '#7B7A95', marginBottom: 10, fontWeight: 600 }}>Rep performance — this month</div>
        {[
          { name: 'Priya Singh', deals: 6, won: 3, rate: '62%', rateC: '#10B981' },
          { name: 'Tom Becker', deals: 8, won: 3, rate: '41%', rateC: '#F5A524' },
          { name: 'Marco R.', deals: 5, won: 1, rate: '22%', rateC: '#E4483F' },
        ].map((r, i) => (
          <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i ? '1px solid #1E1E28' : 'none' }}>
            <span style={{ fontSize: 10, color: '#EDEDF4' }}>{r.name}</span>
            <div style={{ display: 'flex', gap: 10, fontSize: 9.5 }}>
              <span style={{ color: '#7B7A95' }}>{r.deals} deals</span>
              <span style={{ color: r.rateC, fontWeight: 700 }}>{r.rate} WR</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── MAIN COMPONENT ───────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()
  const [navSolid, setNavSolid] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formSent, setFormSent] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', company: '', size: '', challenge: '' })
  const isDark = theme === 'dark'

  // Theme-aware colors
  const bg      = isDark ? '#09090F' : '#F4F5F8'
  const surf    = isDark ? '#111118' : '#FFFFFF'
  const surf2   = isDark ? '#0E0E17' : '#F0F1F8'
  const border  = isDark ? '#1E1E28' : '#E2E4EC'
  const text    = isDark ? '#EDEDF4' : '#12141C'
  const muted   = isDark ? '#7B7A95' : '#5A5F7A'

  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    const msg = `Hi! I'm interested in SalesPilot CRM.\n\nName: ${formData.name}\nPhone: ${formData.phone}${formData.company ? '\nCompany: ' + formData.company : ''}${formData.size ? '\nTeam size: ' + formData.size : ''}${formData.challenge ? '\n\nChallenge: ' + formData.challenge : ''}`
    // Persist the lead server-side FIRST — the WhatsApp handoff below is a convenience
    // channel, not the record of truth. If a visitor opens WhatsApp and never hits send,
    // the submission must not just vanish.
    const apiBase = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001'
    fetch(`${apiBase}/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name, phone: formData.phone,
        company: formData.company || undefined,
        teamSize: formData.size || undefined,
        challenge: formData.challenge || undefined,
      }),
    }).catch(() => {}) // best-effort — never block the WhatsApp handoff on this
    window.open('https://wa.me/919555790855?text=' + encodeURIComponent(msg), '_blank')
    setFormSent(true)
  }

  const navBg = navSolid ? (isDark ? 'rgba(9,9,15,.92)' : 'rgba(244,245,248,.95)') : 'transparent'
  const navBorder = navSolid ? `1px solid ${border}` : '1px solid transparent'

  const sectionH = (t: string) => (
    <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(26px,4.5vw,48px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, color: text, marginBottom: 16 }}>{t}</h2>
  )
  const sectionP = (t: string) => (
    <p style={{ fontSize: 16, color: muted, lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>{t}</p>
  )

  return (
    <div style={{ background: bg, color: text, fontFamily: "'Inter', sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 0',
        background: navBg, borderBottom: navBorder,
        backdropFilter: navSolid ? 'blur(16px)' : 'none', transition: 'all .3s' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: text, textDecoration: 'none', letterSpacing: -.4 }}>
            Sales<span style={{ color: '#10B981' }}>Pilot</span>
          </a>

          {/* desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hidden md:flex">
            {[['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#contact', 'Contact']].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 13.5, color: muted, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = text)}
                onMouseLeave={e => (e.currentTarget.style.color = muted)}>
                {label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme toggle */}
            <button onClick={toggle} style={{
              width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: surf, border: `1px solid ${border}`, cursor: 'pointer', transition: 'all .2s',
            }}>
              {isDark ? <Sun size={14} color={muted} /> : <Moon size={14} color={muted} />}
            </button>

            {/* App login */}
            <button onClick={() => navigate('/login')} style={{
              fontSize: 13, fontWeight: 600, color: '#fff', padding: '9px 20px', borderRadius: 100,
              background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              border: 'none', cursor: 'pointer', fontFamily: "'Sora', sans-serif",
            }}>
              Sign in
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(o => !o)} style={{ display: 'none', flexDirection: 'column', gap: 5, cursor: 'pointer', padding: 4, background: 'transparent', border: 'none' }}
              className="flex md:hidden">
              <span style={{ width: 22, height: 2, background: muted, borderRadius: 2, display: 'block' }} />
              <span style={{ width: 22, height: 2, background: muted, borderRadius: 2, display: 'block' }} />
              <span style={{ width: 22, height: 2, background: muted, borderRadius: 2, display: 'block' }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: navBg, borderTop: `1px solid ${border}`, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['#contact', 'Contact']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 16, color: text, textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 28px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* background orbs */}
        {[
          { w: 700, h: 700, t: '-200px', l: '50%', tx: '-50%', color: 'rgba(16,185,129,.12)' },
          { w: 500, h: 500, b: '-100px', r: '-150px', color: 'rgba(76,139,245,.07)' },
          { w: 400, h: 400, b: '0', l: '-120px', color: 'rgba(245,165,36,.06)' },
        ].map((o, i) => (
          <div key={i} style={{
            position: 'absolute', width: o.w, height: o.h, borderRadius: '50%', pointerEvents: 'none',
            background: `radial-gradient(circle,${o.color} 0%,transparent 65%)`,
            top: o.t, left: o.l, right: o.r, bottom: o.b, transform: o.tx ? `translateX(${o.tx})` : undefined,
          }} />
        ))}

        {/* eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600,
          color: '#10B981', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)',
          borderRadius: 999, padding: '6px 16px', marginBottom: 32,
          fontFamily: "'Sora', sans-serif", letterSpacing: .3,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite', display: 'block' }} />
          Built for sales teams that mean business
        </div>

        <h1 style={{
          fontFamily: "'Sora', sans-serif", fontSize: 'clamp(38px,7vw,78px)', fontWeight: 800,
          letterSpacing: -2.5, lineHeight: .95, color: text, marginBottom: 28, maxWidth: 860, position: 'relative',
        }}>
          Your team is busy.<br />
          <span style={{ color: muted, fontWeight: 300 }}>Your deals shouldn't</span><br />
          pay the price.
        </h1>

        <p style={{ fontSize: 'clamp(15px,2vw,19px)', color: muted, maxWidth: 540, margin: '0 auto 48px', lineHeight: 1.7 }}>
          Every missed follow-up is a lost deal. SalesPilot makes sure your whole team knows what to do next — without anyone having to ask.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <a href="https://wa.me/919555790855?text=Hi%2C%20I%27m%20interested%20in%20SalesPilot%20CRM" target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#fff', padding: '15px 32px', borderRadius: 999, background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.28)', textDecoration: 'none', fontFamily: "'Sora', sans-serif" }}>
            Chat with us on WhatsApp
          </a>
          <a href="#how"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 500, color: text, padding: '15px 28px', borderRadius: 999, border: `1px solid ${border}`, textDecoration: 'none' }}>
            See how it works <ChevronDown size={16} />
          </a>
        </div>
        <p style={{ fontSize: 12, color: muted }}>₹500 per person · No long contracts · Setup in 24 hours</p>

        {/* scroll indicator */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: 'bob 2.5s infinite' }}>
          <span style={{ fontSize: 11, color: muted }}>scroll</span>
          <div style={{ width: 18, height: 18, borderRight: `2px solid ${muted}`, borderBottom: `2px solid ${muted}`, transform: 'rotate(45deg)' }} />
        </div>
      </section>

      {/* ── PAIN POINTS ──────────────────────────────────── */}
      <section style={{ padding: '100px 28px', textAlign: 'center' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>SOUND FAMILIAR?</p>
          {sectionH('The problems every sales team faces')}
          {sectionP('Before SalesPilot, most teams are losing deals they shouldn\'t — not because they\'re bad at sales, but because nothing keeps them organised.')}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 1, marginTop: 70, background: border, borderRadius: 24, overflow: 'hidden' }}>
            {[
              { n: '01', title: '"Who was supposed to call them?"', body: 'Follow-ups fall through the cracks when they\'re tracked in someone\'s head, a notebook, or a WhatsApp message that gets buried three days later.' },
              { n: '02', title: '"How\'s the pipeline looking?"', body: 'The manager has to ask three people, check two spreadsheets, and still isn\'t confident. Nobody has the full picture at the same time.' },
              { n: '03', title: '"We lost that deal? Why?"', body: 'By the time you realise a deal went cold, it\'s already too late. There was no alert, no reminder, and no one was watching.' },
            ].map(p => (
              <div key={p.title} style={{ padding: '44px 36px', background: bg, textAlign: 'left' }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 30, fontWeight: 800, display: 'block', marginBottom: 20, color: 'transparent', WebkitTextStroke: `1.5px ${border}` }}>{p.n}</span>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: text, marginBottom: 12, letterSpacing: -.3, lineHeight: 1.2 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: muted, lineHeight: 1.7 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* wave divider */}
      <div style={{ height: 80, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '100%' }}>
          <path d={`M0 80L1440 80L1440 30C1200 70 800 0 400 40C200 60 100 25 0 40Z`} fill={surf2} />
        </svg>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how" style={{ background: surf2, padding: '80px 28px 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 80, maxWidth: 1100, margin: '0 auto 80px' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>HOW IT WORKS</p>
          {sectionH('One place for your entire sales operation')}
          {sectionP('From the first conversation with a lead to the moment they sign — everything is tracked, visible, and on time.')}
        </div>

        {[
          {
            n: '01', title: 'See every deal at a glance',
            body: 'Your entire pipeline laid out visually. Move deals forward with a drag. The whole team sees the same board, always live, always accurate.',
            points: ['Every deal has a clear stage — nothing hidden in someone\'s inbox', 'See the total value of your pipeline at a glance', 'When a deal is won, the whole team sees it instantly'],
            visual: <PipelineMock />,
          },
          {
            n: '02', title: 'Never forget a follow-up again',
            body: 'Every morning your team opens the app and immediately knows who to call and which deals are at risk. The system tells them — no one has to remember.',
            points: ['Deals turn red the moment a follow-up is overdue', 'Managers see every rep\'s overdue list, not just their own', 'Automatic reminders — no one needs to set manual alarms'],
            visual: <DashMock />,
            flip: true,
          },
          {
            n: '03', title: 'Your team stays on the same page',
            body: 'Every call, email, meeting, and note is logged against the deal — so anyone can pick up where someone else left off. No "I didn\'t know they\'d already spoken to the client."',
            points: ['Log calls and meetings in seconds, not minutes', '@mention a colleague to loop them in instantly', 'Send emails from inside the deal — they auto-save'],
            visual: <ActivityMock />,
          },
        ].map((block, i) => (
          <div key={block.n} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center',
            maxWidth: 1000, margin: '0 auto', marginBottom: i < 2 ? 120 : 0,
            direction: block.flip ? 'rtl' : 'ltr',
          }}>
            <div style={{ direction: 'ltr' }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 64, fontWeight: 900, color: 'transparent', WebkitTextStroke: `1px ${border}`, lineHeight: 1, marginBottom: 12, letterSpacing: -3 }}>{block.n}</div>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, letterSpacing: -1, color: text, marginBottom: 14, lineHeight: 1.1 }}>{block.title}</h3>
              <p style={{ fontSize: 15, color: muted, lineHeight: 1.75, marginBottom: 20 }}>{block.body}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {block.points.map(pt => (
                  <li key={pt} style={{ fontSize: 13.5, color: muted, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
                    <span style={{ color: '#10B981', flexShrink: 0, marginTop: 2, fontWeight: 700 }}>↗</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ direction: 'ltr', borderRadius: 24, overflow: 'hidden' }}>{block.visual}</div>
          </div>
        ))}
      </section>

      {/* wave divider 2 */}
      <div style={{ height: 80, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, width: '100%', transform: 'scaleY(-1)' }}>
          <path d="M0 80L1440 80L1440 30C1200 70 800 0 400 40C200 60 100 25 0 40Z" fill={surf2} />
        </svg>
      </div>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 28px 100px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>FEATURES</p>
          {sectionH('Everything your sales team needs')}
          {sectionP('Built around what actually matters — tracking leads, following up, staying organised, and knowing what\'s working.')}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 2, marginTop: 60, background: border, borderRadius: 28, overflow: 'hidden' }}>
            {[
              { icon: KanbanSquare, t: 'Visual Pipeline Board', d: 'Drag your deals from stage to stage. See your whole pipeline on one screen — new leads, follow-up needed, proposals sent, deals closing. No more hunting through emails.' },
              { icon: Clock, t: 'Follow-up Reminders', d: 'Set a next action on any deal. When it\'s due, the deal turns amber. When it\'s overdue, it turns red. Your team always knows what needs to happen today.' },
              { icon: Smartphone, t: 'Works on Any Device', d: 'Log a call from your car park. Check the pipeline from a client\'s waiting room. Mark a deal won right after signing. SalesPilot works on phone, tablet, and laptop.' },
              { icon: History, t: 'Complete Activity History', d: 'Every call note, every email, every meeting — all logged against the deal in order. Anyone on the team can see exactly what happened and when.' },
              { icon: BarChart3, t: 'Pipeline Analytics', d: 'See your conversion rates at each stage. Know which stage you lose deals at. See which months are strongest. Real numbers that help you make better decisions.' },
              { icon: Users2, t: 'Team Performance View', d: 'See which rep has the highest win rate, who is most active, and who needs support. Managers get full visibility without having to ask anyone.' },
              { icon: MessageSquare, t: 'Team Collaboration', d: 'Comment on deals and @mention colleagues. Convert a comment into a task with one click. Everyone stays in the loop without extra meetings.' },
              { icon: Send, t: 'Send Emails from Inside the App', d: 'Connect your Gmail and send emails directly from a deal page. Every email is automatically saved to the deal — your team can see what was sent and when.' },
              { icon: FolderOpen, t: 'Documents per Deal', d: 'Attach proposals, contracts, pricing sheets, and brochures directly to each deal. Stop hunting for "that PDF I sent last Tuesday".' },
              { icon: Trophy, t: 'Lead Scoring', d: 'Know which leads are most likely to convert. Score leads based on how they\'ve engaged so your team focuses energy where it counts most.' },
              { icon: BellRing, t: 'Real-time Notifications', d: 'Get notified the moment someone @mentions you, assigns you a task, or a deal changes status. No more checking back to see what happened.' },
              { icon: ShieldCheck, t: 'Secure & Private', d: 'Your company\'s data is completely separate from every other company\'s. Only your team can see your deals. We take data security seriously from day one.' },
            ].map(f => (
              <div key={f.t} style={{ padding: '36px 32px', background: bg, textAlign: 'left', transition: 'background .3s' }}
                onMouseEnter={e => (e.currentTarget.style.background = surf)}
                onMouseLeave={e => (e.currentTarget.style.background = bg)}>
                <f.icon size={22} strokeWidth={1.75} color="#10B981" style={{ display: 'block', marginBottom: 18 }} />
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: text, marginBottom: 8, letterSpacing: -.2 }}>{f.t}</h3>
                <p style={{ fontSize: 13.5, color: muted, lineHeight: 1.7 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANALYTICS SECTION ────────────────────────────── */}
      <section style={{ background: surf2, padding: '100px 28px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>ANALYTICS</p>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, color: text, marginBottom: 16 }}>Know exactly why you win and lose deals</h2>
            <p style={{ fontSize: 15, color: muted, lineHeight: 1.75, marginBottom: 28 }}>After a month of using SalesPilot, you'll know which stage loses you the most deals, which rep has the best win rate, and which type of client converts fastest. Real numbers, not gut feelings.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Where exactly in your pipeline deals are dying',
                'Which rep needs coaching and which one to learn from',
                'How long deals stay in each stage on average',
                'Your best and worst months — and why',
                'Which reasons come up most when deals are lost',
              ].map(pt => (
                <div key={pt} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: muted }}>
                  <Check size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                  {pt}
                </div>
              ))}
            </div>
          </div>
          <AnalyticsMock />
        </div>
      </section>

      {/* ── WHY US ───────────────────────────────────────── */}
      <section style={{ padding: '100px 28px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>WHY SALESPILOT</p>
          {sectionH('We built this for small teams, not big enterprises')}
          {sectionP('Most CRM tools are built for 500-person companies with a dedicated IT team. We built this for teams of 5 to 50 — where everyone wears multiple hats.')}
        </div>

        <div style={{ maxWidth: 780, margin: '64px auto 0', display: 'flex', flexDirection: 'column' }}>
          {[
            { icon: Zap, t: 'You\'re live in 24 hours, not 24 days', d: 'We set everything up for you. You give us your team\'s names and tell us your pipeline stages — we handle the rest. No IT team needed, no training sessions that drag on for weeks.' },
            { icon: Lock, t: 'Your data belongs to you alone', d: 'Each company\'s data is completely locked away from everyone else\'s — including us. Your leads, your deals, your conversations. Nobody else can ever see them, not even by accident.' },
            { icon: Headset, t: 'Real people, not a ticket system', d: 'When something isn\'t working, you WhatsApp us directly. You\'re talking to the people who built this. We respond fast because your problem is our problem too.' },
            { icon: TrendingUp, t: 'One missed deal pays for a whole year', d: 'At ₹500 per person per month, a team of 5 costs ₹2,500/month. If SalesPilot helps you close one extra deal per month — and it will — it has already paid for itself many times over.' },
            { icon: Smartphone, t: 'Your team will actually use it', d: 'We tried two other CRMs before this — our clients tell us. Both were so complicated the team stopped using them after a week. SalesPilot is the first one where everyone actually logs in every day.' },
            { icon: MapPin, t: 'Built for Indian sales teams', d: 'We understand the way Indian sales teams work — the follow-up culture, the WhatsApp-first communication, the relationship-driven deals. This tool is designed for how you actually sell, not how a Silicon Valley playbook says you should.' },
          ].map((item, i) => (
            <div key={item.t} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 24, alignItems: 'flex-start', padding: '32px 0', borderBottom: i < 5 ? `1px solid ${border}` : 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon size={19} strokeWidth={1.75} color="#10B981" />
              </div>
              <div>
                <h4 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: text, marginBottom: 8, letterSpacing: -.3 }}>{item.t}</h4>
                <p style={{ fontSize: 14, color: muted, lineHeight: 1.75 }}>{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981', letterSpacing: 2, marginBottom: 16, fontFamily: "'Sora', sans-serif" }}>PRICING</p>
          {sectionH('Simple, honest pricing')}
          {sectionP('Pay per person per month. We bill you manually — UPI or bank transfer. No auto-deductions, no hidden charges, no annual lock-in you didn\'t know about.')}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 60, alignItems: 'start' }}>
            {[
              {
                name: 'Starter', price: '₹400', per: 'per person / month · up to 5 people',
                feats: ['Visual pipeline board', 'Daily follow-up reminders', 'Activity feed — calls, notes, emails', 'Basic analytics', 'Sign in with Google', 'WhatsApp support'],
                cta: 'Talk to us', hot: false,
                link: 'https://wa.me/919555790855?text=Hi%2C+I%27m+interested+in+SalesPilot+Starter',
              },
              {
                name: 'Professional', price: '₹500', per: 'per person / month · unlimited team',
                feats: ['Everything in Starter', 'Unlimited team size', 'Send emails from the app', 'Document storage per deal', 'Full analytics + rep performance', 'Lead scoring & qualification', 'Live updates across your team', 'Priority WhatsApp support'],
                cta: 'Get started', hot: true,
                link: 'https://wa.me/919555790855?text=Hi%2C+I%27m+interested+in+SalesPilot+Professional',
              },
              {
                name: 'Custom', price: 'Talk to us', per: 'for larger teams or special needs',
                feats: ['Everything in Professional', 'Custom pipeline stages for your industry', 'Data import from your current system', 'Team training & onboarding', 'Dedicated support contact', 'Custom SLA agreement'],
                cta: 'Contact us', hot: false,
                link: 'https://wa.me/919555790855?text=Hi%2C+I%27d+like+to+discuss+a+custom+plan',
              },
            ].map(p => (
              <div key={p.name} style={{
                borderRadius: 28, padding: 36, position: 'relative',
                background: surf, border: p.hot ? '1px solid rgba(16,185,129,.4)' : `1px solid ${border}`,
                boxShadow: p.hot ? '0 0 60px rgba(16,185,129,.12)' : 'none',
                transform: p.hot ? 'scale(1.04)' : 'none',
                transition: 'transform .3s',
              }}>
                {p.hot && <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10B981,#059669)', borderRadius: 999, padding: '4px 14px', marginBottom: 20, fontFamily: "'Sora', sans-serif" }}>Most popular</div>}
                <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>{p.name}</div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: p.name === 'Custom' ? 28 : 42, fontWeight: 900, color: text, letterSpacing: -2, lineHeight: 1 }}>{p.price}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4, marginBottom: 28 }}>{p.per}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32, textAlign: 'left' }}>
                  {p.feats.map(f => (
                    <div key={f} style={{ fontSize: 13.5, color: muted, display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.4 }}>
                      <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <a href={p.link} target="_blank" rel="noreferrer" style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px',
                  borderRadius: 999, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600,
                  background: p.hot ? 'linear-gradient(135deg,#10B981,#059669)' : 'transparent',
                  color: p.hot ? '#fff' : text,
                  border: p.hot ? 'none' : `1px solid ${border}`,
                  boxShadow: p.hot ? '0 4px 14px rgba(16,185,129,0.28)' : 'none',
                }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12.5, color: muted, marginTop: 28 }}>₹10,000 one-time setup fee for all plans · Includes onboarding call, data import help, and team setup</p>
        </div>
      </section>

      {/* ── BIG CTA ──────────────────────────────────────── */}
      <section style={{ padding: '60px 28px 80px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: 'linear-gradient(135deg,rgba(16,185,129,.15),rgba(5,150,105,.08))', border: '1px solid rgba(16,185,129,.25)', borderRadius: 40, padding: 80, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.12) 0%,transparent 65%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }} />
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(28px,4.5vw,50px)', fontWeight: 900, letterSpacing: -2, color: text, marginBottom: 16, position: 'relative', zIndex: 1 }}>Ready to stop losing deals?</h2>
          <p style={{ fontSize: 16, color: muted, marginBottom: 40, lineHeight: 1.65, position: 'relative', zIndex: 1 }}>Send us a WhatsApp right now. We'll show you a demo, understand your business, and get your team set up — usually within the same day.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <a href="https://wa.me/919555790855?text=Hi%2C+I%27d+like+to+learn+more+about+SalesPilot+CRM" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, color: '#fff', padding: '14px 28px', borderRadius: 999, background: '#25D366', boxShadow: '0 0 24px rgba(37,211,102,.35)', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.122 1.522 5.855L.057 23.854l6.144-1.61A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.82 9.82 0 01-5.035-1.385l-.361-.214-3.747.981 1.001-3.656-.235-.376A9.822 9.822 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z"/></svg>
              WhatsApp: +91 95557 90855
            </a>
            <a href="mailto:ayushmanmishraji1@gmail.com"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 500, color: text, padding: '14px 24px', borderRadius: 999, border: `1px solid ${border}`, textDecoration: 'none' }}>
              <Mail size={16} /> ayushmanmishraji1@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ─────────────────────────────────── */}
      <section id="contact" style={{ background: surf2, padding: '80px 28px 100px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(24px,4vw,40px)', fontWeight: 800, letterSpacing: -1.5, color: text, marginBottom: 14, lineHeight: 1.1 }}>Let's get your team organised</h2>
            <p style={{ fontSize: 14.5, color: muted, lineHeight: 1.7, marginBottom: 32 }}>Tell us about your team. We'll show you exactly how SalesPilot can help — no sales pitch, just an honest conversation.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '💬', label: 'WhatsApp (fastest)', value: '+91 95557 90855', href: 'https://wa.me/919555790855' },
                { icon: '📧', label: 'Email', value: 'ayushmanmishraji1@gmail.com', href: 'mailto:ayushmanmishraji1@gmail.com' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: 10.5, color: muted, marginBottom: 2 }}>{c.label}</div>
                    <a href={c.href} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#10B981', textDecoration: 'none', fontWeight: 500 }}>{c.value}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            {formSent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: text, marginBottom: 8 }}>We got it!</h3>
                <p style={{ fontSize: 13, color: muted }}>Expect a WhatsApp message from us within a few hours. If it's urgent, message directly at +91 95557 90855.</p>
              </div>
            ) : (
              <form onSubmit={submitForm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Your name', key: 'name', type: 'text', ph: 'Rahul Sharma', req: true },
                  { label: 'WhatsApp number', key: 'phone', type: 'tel', ph: '+91 98765 43210', req: true },
                  { label: 'Company name', key: 'company', type: 'text', ph: 'Acme Exports Pvt Ltd', req: false },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11.5, color: muted, display: 'block', marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.ph} required={f.req}
                      value={(formData as any)[f.key]}
                      onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '12px 16px', fontSize: 13.5, color: text, outline: 'none', fontFamily: "'Inter', sans-serif" }}
                      onFocus={e => (e.target.style.borderColor = '#10B981')}
                      onBlur={e => (e.target.style.borderColor = border)}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11.5, color: muted, display: 'block', marginBottom: 6 }}>How big is your team?</label>
                  <select value={formData.size} onChange={e => setFormData(d => ({ ...d, size: e.target.value }))}
                    style={{ width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '12px 16px', fontSize: 13.5, color: text, outline: 'none', fontFamily: "'Inter', sans-serif", WebkitAppearance: 'none' }}>
                    <option value="">Select size</option>
                    {['Just me', '2–5 people', '6–15 people', '16–50 people', '50+ people'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: muted, display: 'block', marginBottom: 6 }}>What's your biggest challenge? (optional)</label>
                  <textarea value={formData.challenge} onChange={e => setFormData(d => ({ ...d, challenge: e.target.value }))}
                    placeholder="e.g. We lose track of follow-ups, we don't know our pipeline status..."
                    rows={3}
                    style={{ width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '12px 16px', fontSize: 13.5, color: text, outline: 'none', fontFamily: "'Inter', sans-serif", resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = '#10B981')}
                    onBlur={e => (e.target.style.borderColor = border)}
                  />
                </div>
                <button type="submit" style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Sora', sans-serif", background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.28)' }}>
                  Send — we'll reply on WhatsApp →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: '36px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: text }}>
            Sales<span style={{ color: '#10B981' }}>Pilot</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[['#how', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing'], ['https://wa.me/919555790855', 'WhatsApp'], ['mailto:ayushmanmishraji1@gmail.com', 'Email']].map(([href, label]) => (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                style={{ fontSize: 12.5, color: muted, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#10B981')}
                onMouseLeave={e => (e.currentTarget.style.color = muted)}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: muted }}>© 2026 SalesPilot · Made in India 🇮🇳</div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes bob { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${border};border-radius:2px}
        @media(max-width:768px){
          [data-grid-cols="3"]{grid-template-columns:1fr !important}
          [data-how-block]{grid-template-columns:1fr !important;direction:ltr !important}
        }
      `}</style>
    </div>
  )
}
