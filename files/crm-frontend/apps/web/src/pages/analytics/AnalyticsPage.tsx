import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { Card, CardHeader, StatCard, Tabs, ProgressBar, Spinner, Badge } from '../../components/ui'
import { formatCurrency } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'
import {
  TrendingUp, TrendingDown, Users, BarChart2, Target,
  Zap, Award, AlertCircle, CheckCircle, Clock
} from 'lucide-react'

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({ data, valueKey = 'value', labelKey = 'stage', color = 'var(--green)' }: {
  data: any[]; valueKey?: string; labelKey?: string; color?: string
}) {
  const max = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const h = Math.max(4, ((d[valueKey] ?? 0) / max) * 100)
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${h}%`, background: color, opacity: h === 100 ? 1 : 0.55 + (h / 100) * 0.45 }} />
            <span className="text-[8.5px] truncate w-full text-center" style={{ color: 'var(--text-3)' }}>
              {d[labelKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Funnel stage row ──────────────────────────────────────────────────────────
function FunnelRow({ label, count, value, pct, currency }: { label: string; count: number; value: number; pct: number; currency: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-28 text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{label}</div>
      <div className="flex-1">
        <ProgressBar pct={pct} />
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{count}</div>
        <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{formatCurrency(value, currency)}</div>
      </div>
      <div className="w-10 text-right text-[11px] font-medium" style={{ color: 'var(--green)' }}>{pct}%</div>
    </div>
  )
}

// ── Rep row ───────────────────────────────────────────────────────────────────
function RepRow({ rep, currency, maxValue }: { rep: any; currency: string; maxValue: number }) {
  const pct = maxValue > 0 ? Math.round((rep.openValue / maxValue) * 100) : 0
  return (
    <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-full gradient flex-shrink-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{rep.name?.[0] ?? '?'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12.5px] font-semibold" style={{ color: 'var(--text)' }}>{rep.name}</span>
          <span className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>{formatCurrency(rep.wonThisMonth, currency)}</span>
        </div>
        <ProgressBar pct={pct} />
        <div className="flex gap-4 mt-1.5">
          {[
            { label: 'Open', value: rep.openCount },
            { label: 'Won', value: rep.wonCount },
            { label: 'Overdue', value: rep.overdueCount },
            { label: 'Win rate', value: `${rep.winRate}%` },
          ].map(m => (
            <div key={m.label}>
              <span className="text-[9.5px]" style={{ color: 'var(--text-3)' }}>{m.label} </span>
              <span className="text-[10px] font-semibold" style={{ color: m.label === 'Overdue' && (m.value as number) > 0 ? '#E4483F' : 'var(--text)' }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const role    = useAuthStore(s => s.user?.role)
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState('pipeline')

  const tabs = [
    { key: 'pipeline', label: 'Pipeline',  icon: BarChart2 },
    { key: 'funnel',   label: 'Funnel',    icon: Target },
    { key: 'forecast', label: 'Forecast',  icon: TrendingUp },
    ...(isAdmin ? [{ key: 'team', label: 'Team KPIs', icon: Users }] : []),
  ]

  const { data: pd, isLoading: pLoading } = useQuery({
    queryKey: ['analytics-pipeline'],
    queryFn:  () => analyticsApi.pipeline().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: rd, isLoading: rLoading } = useQuery({
    queryKey: ['analytics-reps'],
    queryFn:  () => analyticsApi.reps().then(r => r.data),
    enabled:  isAdmin && tab === 'team',
    staleTime: 5 * 60_000,
  })

  const currency = pd?.currency ?? 'USD'

  const sla = pd?.slaBreakdown ?? {}
  const totalOpen = pd?.openCount ?? 1

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Analytics</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            Pipeline health, team performance, and revenue insights
          </p>
        </div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {/* ── PIPELINE TAB ── */}
      {tab === 'pipeline' && (pLoading ? <Spinner /> : !pd ? null : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Open pipeline"    value={formatCurrency(pd.openValue, currency)}       icon={TrendingUp} sub={`${pd.openCount} deals`} />
            <StatCard label="Won this month"   value={formatCurrency(pd.wonThisMonth, currency)}    icon={Award}      sub={`${pd.wonCountMonth} deals closed`} trend="up" />
            <StatCard label="Win rate"         value={`${pd.winRate}%`}                             icon={Target}     sub="won vs lost" />
            <StatCard label="vs last month"    value={formatCurrency(pd.wonThisMonth - (pd.wonLastMonth ?? 0), currency)}
              icon={pd.wonThisMonth >= (pd.wonLastMonth ?? 0) ? TrendingUp : TrendingDown}
              trend={pd.wonThisMonth >= (pd.wonLastMonth ?? 0) ? 'up' : 'down'}
              sub="revenue change" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Stage chart */}
            <Card className="col-span-2">
              <CardHeader title="Deals by stage" />
              <div className="p-5">
                <BarChart data={pd.dealsByStage ?? []} valueKey="value" labelKey="stage" />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {(pd.dealsByStage ?? []).map((s: any) => (
                    <div key={s.stage} className="rounded-lg p-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div className="text-[10px] truncate mb-1" style={{ color: 'var(--text-3)' }}>{s.stage}</div>
                      <div className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>{s.count}</div>
                      <div className="text-[10px]" style={{ color: 'var(--green)' }}>{formatCurrency(s.value, currency)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* SLA health */}
            <Card>
              <CardHeader title="SLA health" />
              <div className="p-4 flex flex-col gap-3">
                {[
                  { key: 'overdue',     label: 'Overdue',     color: '#E4483F', icon: AlertCircle },
                  { key: 'due_today',   label: 'Due today',   color: '#F5A524', icon: Clock },
                  { key: 'upcoming',    label: 'Upcoming',    color: '#4C8BF5', icon: Target },
                  { key: 'on_track',    label: 'On track',    color: '#2FAE60', icon: CheckCircle },
                  { key: 'unscheduled', label: 'Unscheduled', color: '#98A2B3', icon: Zap },
                ].map(({ key, label, color, icon: Icon }) => {
                  const count = sla[key] ?? 0
                  const pct   = Math.round((count / totalOpen) * 100) || 0
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Icon size={11} style={{ color }} />
                          <span className="text-[11.5px]" style={{ color: 'var(--text)' }}>{label}</span>
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color }}>{count}</span>
                      </div>
                      <ProgressBar pct={pct} color={color} height={4} />
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </>
      ))}

      {/* ── FUNNEL TAB ── */}
      {tab === 'funnel' && (pLoading ? <Spinner /> : !pd ? null : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader title="Sales funnel — deals by stage" />
            <div className="px-5 py-2">
              {(() => {
                const stages = pd.dealsByStage ?? []
                const topCount = Math.max(...stages.map((s: any) => s.count), 1)
                return stages.map((s: any) => (
                  <FunnelRow
                    key={s.stage}
                    label={s.stage}
                    count={s.count}
                    value={s.value}
                    pct={Math.round((s.count / topCount) * 100)}
                    currency={currency}
                  />
                ))
              })()}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card padding="20px">
              <div className="text-[11px] uppercase tracking-wide mb-3 font-medium" style={{ color: 'var(--text-3)' }}>Conversion insights</div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-[24px] font-bold" style={{ color: 'var(--green)' }}>{pd.winRate}%</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>Overall win rate this month</div>
                </div>
                <div>
                  <div className="text-[24px] font-bold" style={{ color: 'var(--text)' }}>
                    {formatCurrency(pd.openCount > 0 ? pd.openValue / pd.openCount : 0, currency)}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>Avg deal size (open)</div>
                </div>
                <div>
                  <div className="text-[24px] font-bold" style={{ color: 'var(--text)' }}>{pd.openCount}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>Open opportunities</div>
                </div>
              </div>
            </Card>

            <Card padding="20px">
              <div className="text-[11px] uppercase tracking-wide mb-3 font-medium" style={{ color: 'var(--text-3)' }}>Revenue this month</div>
              <div className="text-[22px] font-bold mb-1" style={{ color: 'var(--green)' }}>
                {formatCurrency(pd.wonThisMonth, currency)}
              </div>
              <div className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>{pd.wonCountMonth} deals closed</div>
              <div className="text-[11px] flex items-center gap-1.5">
                {pd.wonThisMonth >= (pd.wonLastMonth ?? 0)
                  ? <TrendingUp size={12} style={{ color: '#2FAE60' }} />
                  : <TrendingDown size={12} style={{ color: '#E4483F' }} />}
                <span style={{ color: pd.wonThisMonth >= (pd.wonLastMonth ?? 0) ? '#2FAE60' : '#E4483F' }}>
                  {formatCurrency(Math.abs(pd.wonThisMonth - (pd.wonLastMonth ?? 0)), currency)} vs last month
                </span>
              </div>
            </Card>
          </div>
        </div>
      ))}

      {/* ── FORECAST TAB ── */}
      {tab === 'forecast' && (pLoading ? <Spinner /> : !pd ? null : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader title="Revenue forecast" />
            <div className="p-5">
              <div className="text-[11.5px] mb-5" style={{ color: 'var(--text-3)' }}>
                Based on current open pipeline and historical win rate of {pd.winRate}%
              </div>

              {/* Simple forecast cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Committed',   value: pd.openValue * (pd.winRate / 100) * 0.6, desc: 'High-probability deals' },
                  { label: 'Best case',   value: pd.openValue * (pd.winRate / 100),        desc: 'At win rate' },
                  { label: 'Pipeline',    value: pd.openValue,                              desc: 'Full open pipeline' },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>{f.label}</div>
                    <div className="text-[18px] font-bold" style={{ color: 'var(--green)' }}>{formatCurrency(f.value, currency)}</div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* SLA risk */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(228,72,63,0.06)', border: '1px solid rgba(228,72,63,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={13} style={{ color: '#E4483F' }} />
                  <span className="text-[12px] font-semibold" style={{ color: '#E4483F' }}>At-risk pipeline</span>
                </div>
                <div className="text-[13px]" style={{ color: 'var(--text)' }}>
                  {formatCurrency(pd.openValue * ((sla.overdue ?? 0) / totalOpen), currency)} at risk due to {sla.overdue ?? 0} overdue deals
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>
                  Action these now to protect your forecast
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pipeline quality" />
            <div className="p-4 flex flex-col gap-4">
              {[
                { label: 'Healthy',     count: (sla.on_track ?? 0) + (sla.upcoming ?? 0), color: '#2FAE60', desc: 'on track or upcoming' },
                { label: 'At risk',     count: sla.due_today ?? 0,   color: '#F5A524', desc: 'due today' },
                { label: 'Overdue',     count: sla.overdue ?? 0,     color: '#E4483F', desc: 'past due date' },
                { label: 'No schedule', count: sla.unscheduled ?? 0, color: '#98A2B3', desc: 'no next action' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>{item.label}</div>
                    <div className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>{item.desc}</div>
                  </div>
                  <div className="text-[20px] font-bold" style={{ color: item.color }}>{item.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}

      {/* ── TEAM KPIs TAB ── */}
      {tab === 'team' && isAdmin && (rLoading ? <Spinner /> : !rd ? null : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader title="Rep performance — this month" />
            <div className="px-5 py-2">
              {(rd.reps ?? []).map((rep: any) => (
                <RepRow
                  key={rep.userId}
                  rep={rep}
                  currency={rd.currency ?? 'USD'}
                  maxValue={Math.max(...(rd.reps ?? []).map((r: any) => r.openValue), 1)}
                />
              ))}
              {(rd.reps ?? []).length === 0 && (
                <div className="py-10 text-center text-[12.5px]" style={{ color: 'var(--text-3)' }}>No rep data yet</div>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {/* Team summary */}
            <Card padding="20px">
              <div className="text-[11px] uppercase tracking-wide mb-3 font-medium" style={{ color: 'var(--text-3)' }}>Team summary</div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Total reps',         value: rd.reps?.length ?? 0 },
                  { label: 'Team pipeline',       value: formatCurrency(rd.reps?.reduce((s: number, r: any) => s + r.openValue, 0) ?? 0, rd.currency ?? 'USD') },
                  { label: 'Team won this month', value: formatCurrency(rd.reps?.reduce((s: number, r: any) => s + r.wonThisMonth, 0) ?? 0, rd.currency ?? 'USD') },
                  { label: 'Total overdue',       value: rd.reps?.reduce((s: number, r: any) => s + r.overdueCount, 0) ?? 0 },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{m.label}</span>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top performer */}
            {rd.reps?.length > 0 && (() => {
              const top = [...(rd.reps ?? [])].sort((a: any, b: any) => b.wonThisMonth - a.wonThisMonth)[0]
              return (
                <Card padding="20px" glow>
                  <div className="text-[10px] uppercase tracking-wide mb-2" style={{ color: 'var(--green)' }}>⭐ Top performer</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient flex items-center justify-center">
                      <span className="text-[12px] font-bold text-white">{top.name?.[0]}</span>
                    </div>
                    <div>
                      <div className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>{top.name}</div>
                      <div className="text-[12px]" style={{ color: 'var(--green)' }}>{formatCurrency(top.wonThisMonth, rd.currency ?? 'USD')} won</div>
                    </div>
                  </div>
                </Card>
              )
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}
