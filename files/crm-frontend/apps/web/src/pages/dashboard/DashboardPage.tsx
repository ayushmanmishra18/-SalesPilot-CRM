import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../../api'
import { Card, CardHeader, StatCard, SlaPill, Spinner } from '../../components/ui'
import { formatCurrency, formatRelativeTime, type SlaStatus } from '../../utils/sla'
import { AlertCircle, TrendingUp, Trophy, Target, Users, ChevronRight, CheckSquare } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user     = useAuthStore(s => s.user)

  const { data: fu, isLoading: fuLoading } = useQuery({
    queryKey: ['followups'],
    queryFn:  () => dashboardApi.followups().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: sum, isLoading: sumLoading } = useQuery({
    queryKey: ['summary'],
    queryFn:  () => dashboardApi.summary().then(r => r.data),
    refetchInterval: 60_000,
  })

  if (fuLoading || sumLoading) return <Spinner />

  const s         = sum?.summary
  const followups = fu?.followups ?? []
  const overdue   = followups.filter((f: any) => f.slaStatus === 'overdue').length
  const currency  = s?.currency ?? 'USD'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {greeting} 👋
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>
            {overdue > 0
              ? `${overdue} overdue follow-up${overdue > 1 ? 's' : ''} need your attention`
              : 'Your pipeline is on track — keep it moving'}
          </p>
        </div>
        <div className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Open pipeline"      value={formatCurrency(s?.openPipelineValue ?? 0, currency)} sub={`${s?.dealsByStage?.reduce((n: number, d: any) => n + d.count, 0) ?? 0} open deals`} icon={TrendingUp} />
        <StatCard label="Overdue follow-ups" value={s?.overdueCount ?? 0}  icon={AlertCircle} urgent={(s?.overdueCount ?? 0) > 0} sub="need action now" />
        <StatCard label="Won this month"     value={formatCurrency(s?.wonThisMonth ?? 0, currency)} icon={Trophy} sub="closed won" trend="up" />
        <StatCard label="Due today"          value={s?.dueTodayCount ?? 0} icon={Target} sub="follow-ups today" />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Follow-ups — 2/3 width */}
        <div className="col-span-2">
          <Card>
            <CardHeader
              title={`Follow-ups (${followups.length})`}
              action={
                <button onClick={() => navigate('/pipeline')}
                  className="text-[11px] font-medium flex items-center gap-1"
                  style={{ color: 'var(--green)' }}>
                  View pipeline <ChevronRight size={11} />
                </button>
              }
            />
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
              {followups.length === 0 ? (
                <div className="py-12 text-center text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                  ✓ All caught up — no urgent follow-ups
                </div>
              ) : followups.map((f: any) => (
                <div key={f.dealId}
                  className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => navigate(`/deals/${f.dealId}`)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: f.slaStatus === 'overdue' ? '#E4483F'
                          : f.slaStatus === 'due_today' ? '#F5A524' : '#4C8BF5',
                      }} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {f.title}
                      </div>
                      <div className="text-[11.5px] truncate" style={{ color: 'var(--text-3)' }}>
                        {f.nextAction?.text ?? 'No action set'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--green)' }}>
                      {formatCurrency(f.value ?? 0, currency)}
                    </span>
                    <SlaPill status={f.slaStatus as SlaStatus} />
                    <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Side panel — 1/3 */}
        <div className="flex flex-col gap-4">
          {/* Pipeline by stage */}
          <Card>
            <CardHeader title="Pipeline by stage" />
            <div className="p-4 flex flex-col gap-3">
              {(s?.dealsByStage ?? []).map((stage: any) => {
                const max = Math.max(...(s?.dealsByStage ?? []).map((s: any) => s.value), 1)
                const pct = Math.max(6, (stage.value / max) * 100)
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11.5px]" style={{ color: 'var(--text)' }}>{stage.stage}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{stage.count} · {formatCurrency(stage.value, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Recent contacts */}
          <Card>
            <CardHeader title="Recent contacts" action={
              <button onClick={() => navigate('/contacts')} className="text-[11px]" style={{ color: 'var(--green)' }}>View all</button>
            } />
            <div className="p-3 flex flex-col gap-0.5">
              {(s?.recentContacts ?? []).map((c: any) => (
                <div key={c.id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/contacts/${c.id}`)}>
                  <div className="w-7 h-7 rounded-full gradient flex-shrink-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{c.name[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>{c.name}</div>
                    {c.company && <div className="text-[10.5px] truncate" style={{ color: 'var(--text-3)' }}>{c.company}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
