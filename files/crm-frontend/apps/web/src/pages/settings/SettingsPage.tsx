import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Trash2, Mail, CheckCircle2, XCircle, Shield } from 'lucide-react'
import { settingsApi, emailApi } from '../../api'
import { Button, Card, CardHeader, Input, Spinner, Tabs, Select } from '../../components/ui'
import { useAuthStore } from '../../store/auth'
import { toast } from '../../components/ui/Toast'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
]

const TIMEZONE_OPTIONS = [
  { value: 'UTC',                label: 'UTC' },
  { value: 'Asia/Kolkata',       label: 'IST — Asia/Kolkata' },
  { value: 'America/New_York',   label: 'EST — America/New_York' },
  { value: 'America/Los_Angeles',label: 'PST — America/Los_Angeles' },
  { value: 'Europe/London',      label: 'GMT — Europe/London' },
  { value: 'Europe/Paris',       label: 'CET — Europe/Paris' },
  { value: 'Asia/Dubai',         label: 'GST — Asia/Dubai' },
  { value: 'Asia/Singapore',     label: 'SGT — Asia/Singapore' },
]

export default function SettingsPage() {
  const role        = useAuthStore(s => s.user?.role)
  const isAdmin     = role === 'admin'
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('workspace')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get().then(r => r.data),
  })

  const { data: emailData } = useQuery({
    queryKey: ['email-accounts'],
    queryFn:  () => emailApi.accounts().then(r => r.data),
  })

  const tenant   = data?.tenant
  const accounts = emailData?.accounts ?? []

  const [name,     setName]     = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [stages,   setStages]   = useState<{ name: string; order: number; isTerminal: boolean }[]>([])
  const [slaConfig, setSlaConfig] = useState({ atRiskWindowDays: 3, unscheduledGraceHours: 24, notifyOnOverdue: true, notifyOwnerDailyDigest: false })

  useEffect(() => {
    if (tenant) {
      setName(tenant.name ?? '')
      setCurrency(tenant.currency ?? 'USD')
      setTimezone(tenant.timezone ?? 'UTC')
      setStages(tenant.stages ?? [])
      setSlaConfig(tenant.slaConfig ?? slaConfig)
    }
  }, [tenant])

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({ name, currency, timezone }),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Workspace settings saved') },
  })

  const stagesMut = useMutation({
    mutationFn: () => settingsApi.updateStages(stages),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Pipeline stages saved') },
  })

  const slaMut = useMutation({
    mutationFn: () => settingsApi.updateSla(slaConfig),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('SLA settings saved') },
  })

  const connectGmailMut = useMutation({
    mutationFn: () => emailApi.connectGoogle().then(r => r.data),
    onSuccess:  (d: any) => { if (d.url) window.location.href = d.url },
    onError:    () => toast.error('Gmail not configured. Set GOOGLE_GMAIL_CLIENT_ID in server .env'),
  })

  const disconnectMut = useMutation({
    mutationFn: (id: string) => emailApi.disconnect(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['email-accounts'] }); toast.success('Email disconnected') },
  })

  // OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    if (code) {
      emailApi.callback(code)
        .then(() => { toast.success('Gmail connected!'); queryClient.invalidateQueries({ queryKey: ['email-accounts'] }) })
        .catch(() => toast.error('Gmail connection failed'))
        .finally(() => window.history.replaceState({}, '', '/settings'))
    }
  }, [])

  if (isLoading) return <Spinner />

  const tabs = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'pipeline',  label: 'Pipeline' },
    { key: 'sla',       label: 'SLA' },
    { key: 'email',     label: 'Email' },
  ]

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Configure your workspace</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ── WORKSPACE ── */}
      {tab === 'workspace' && (
        <Card>
          <CardHeader title="Workspace settings" />
          <div className="p-5 flex flex-col gap-4">
            {!isAdmin && (
              <div className="flex items-center gap-2 text-[12px] px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(76,139,245,0.08)', border: '1px solid rgba(76,139,245,0.25)', color: '#4C8BF5' }}>
                <Shield size={13} /> Only admins can change workspace settings
              </div>
            )}
            <Input label="Company name" value={name} disabled={!isAdmin}
              onChange={e => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Currency" value={currency} disabled={!isAdmin}
                onChange={e => setCurrency(e.target.value)}
                options={CURRENCY_OPTIONS} />
              <Select label="Timezone (display only)" value={timezone} disabled={!isAdmin}
                onChange={e => setTimezone(e.target.value)}
                options={TIMEZONE_OPTIONS} />
            </div>
            {isAdmin && (
              <div className="flex justify-end pt-1">
                <Button loading={saveMut.isPending} onClick={() => saveMut.mutate()}>Save changes</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── PIPELINE ── */}
      {tab === 'pipeline' && (
        <Card>
          <CardHeader title="Pipeline stages" />
          <div className="p-5 flex flex-col gap-3">
            {!isAdmin && (
              <div className="flex items-center gap-2 text-[12px] px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(76,139,245,0.08)', border: '1px solid rgba(76,139,245,0.25)', color: '#4C8BF5' }}>
                <Shield size={13} /> Only admins can configure stages
              </div>
            )}
            <div className="flex flex-col gap-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {isAdmin && <GripVertical size={13} style={{ color: 'var(--text-3)', cursor: 'grab', flexShrink: 0 }} />}
                  <input
                    className="flex-1 bg-transparent text-[13px] outline-none"
                    style={{ color: 'var(--text)' }}
                    value={s.name}
                    disabled={!isAdmin}
                    onChange={e => {
                      const next = [...stages]
                      next[i] = { ...next[i], name: e.target.value }
                      setStages(next)
                    }}
                  />
                  <label className="flex items-center gap-1.5 text-[11px] flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={s.isTerminal} disabled={!isAdmin}
                      onChange={e => {
                        const next = [...stages]
                        next[i] = { ...next[i], isTerminal: e.target.checked }
                        setStages(next)
                      }} />
                    Terminal
                  </label>
                  {isAdmin && (
                    <button onClick={() => setStages(stages.filter((_, j) => j !== i))}
                      style={{ color: '#E4483F', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="flex justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={() => setStages([...stages, { name: 'New stage', order: stages.length, isTerminal: false }])}>
                  <Plus size={12} /> Add stage
                </Button>
                <Button size="sm" loading={stagesMut.isPending} onClick={() => stagesMut.mutate()}>Save stages</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── SLA ── */}
      {tab === 'sla' && (
        <Card>
          <CardHeader title="SLA & follow-up thresholds" />
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-medium" style={{ color: 'var(--text-3)' }}>
                  At-risk window (days)
                </label>
                <input type="number" min={1} max={30}
                  value={slaConfig.atRiskWindowDays}
                  disabled={!isAdmin}
                  onChange={e => setSlaConfig(c => ({ ...c, atRiskWindowDays: +e.target.value }))}
                  className="rounded-[9px] px-3 py-2 text-[13px] outline-none"
                  style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <span className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>Deals due within this many days show as "Upcoming"</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-medium" style={{ color: 'var(--text-3)' }}>
                  Unscheduled grace period (hours)
                </label>
                <input type="number" min={0} max={168}
                  value={slaConfig.unscheduledGraceHours}
                  disabled={!isAdmin}
                  onChange={e => setSlaConfig(c => ({ ...c, unscheduledGraceHours: +e.target.value }))}
                  className="rounded-[9px] px-3 py-2 text-[13px] outline-none"
                  style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <span className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>Hours before unscheduled deals are flagged</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              {[
                { key: 'notifyOnOverdue',        label: 'Notify on overdue',         desc: 'Get notified when a deal becomes overdue' },
                { key: 'notifyOwnerDailyDigest', label: 'Daily digest notification', desc: 'Receive a daily summary of overdue deals' },
              ].map(opt => (
                <label key={opt.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-0.5"
                    checked={(slaConfig as any)[opt.key]}
                    disabled={!isAdmin}
                    onChange={e => setSlaConfig(c => ({ ...c, [opt.key]: e.target.checked }))}
                  />
                  <div>
                    <div className="text-[12.5px] font-medium" style={{ color: 'var(--text)' }}>{opt.label}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {isAdmin && (
              <div className="flex justify-end pt-1">
                <Button loading={slaMut.isPending} onClick={() => slaMut.mutate()}>Save SLA settings</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── EMAIL ── */}
      {tab === 'email' && (
        <Card>
          <CardHeader title="Email integration" />
          <div className="p-5 flex flex-col gap-4">
            <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
              Connect your Gmail account to send emails directly from deal pages. Sent emails are automatically logged in the activity feed.
            </p>

            {accounts.length === 0 ? (
              <div className="rounded-[10px] p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: 'var(--bg)', border: '2px dashed var(--border)' }}>
                <Mail size={28} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>No email connected</div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>Connect Gmail to send from the CRM</div>
                </div>
                <Button onClick={() => connectGmailMut.mutate()} loading={connectGmailMut.isPending}>
                  <Mail size={13} /> Connect Gmail
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {accounts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-[10px] p-4"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <Mail size={15} style={{ color: 'var(--green)' }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{a.emailAddress}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {a.status === 'active'
                            ? <><CheckCircle2 size={11} style={{ color: '#2FAE60' }} /><span className="text-[10.5px]" style={{ color: '#2FAE60' }}>Connected</span></>
                            : <><XCircle size={11} style={{ color: '#E4483F' }} /><span className="text-[10.5px]" style={{ color: '#E4483F' }}>Revoked — reconnect</span></>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => disconnectMut.mutate(a.id)}>
                      Disconnect
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => connectGmailMut.mutate()} loading={connectGmailMut.isPending}>
                  <Plus size={12} /> Add another account
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
