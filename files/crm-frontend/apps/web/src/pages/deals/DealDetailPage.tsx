import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trophy, XCircle, User, DollarSign, Calendar } from 'lucide-react'
import { dealsApi, usersApi } from '../../api'
import { Button, Card, CardHeader, Modal, Input, Spinner, Badge } from '../../components/ui'
import { ActivityComposer } from '../../components/activity/ActivityComposer'
import { ActivityFeed } from '../../components/activity/ActivityFeed'
import { NextActionWidget } from '../../components/deal/NextActionWidget'
import { DocumentsPanel } from '../../components/deal/DocumentsPanel'
import { formatCurrency, formatDate, type SlaStatus } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'
import { toast } from '../../components/ui/Toast'
import { useSocket } from '../../hooks/useSocket'

export default function DealDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const role        = useAuthStore(s => s.user?.role)
  const canWrite    = role === 'admin' || role === 'member'
  const { joinRecord, leaveRecord } = useSocket()

  const [closing,    setClosing]    = useState<'won'|'lost'|null>(null)
  const [lostReason, setLostReason] = useState('')

  const { data: dealData, isLoading } = useQuery({ queryKey:['deal',id], queryFn:() => dealsApi.get(id!).then(r=>r.data), enabled:!!id })
  const { data: usersData }           = useQuery({ queryKey:['users'],    queryFn:() => usersApi.list().then(r=>r.data) })

  const closeMut = useMutation({
    mutationFn: (d: { status:'won'|'lost'; lostReason?: string }) => dealsApi.close(id!, d),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey:['deal',id] })
      queryClient.invalidateQueries({ queryKey:['deals'] })
      const s = res.data?.deal?.status
      if (s==='won') toast.success('Deal won 🎉')
      if (s==='lost') toast.info('Deal marked as lost')
      setClosing(null)
    },
  })

  useEffect(() => { if (!id) return; joinRecord('deal',id); return () => leaveRecord('deal',id) }, [id])

  if (isLoading) return <Spinner />
  const deal   = dealData?.deal
  const users  = usersData?.users ?? []
  if (!deal) return <div className="flex items-center justify-center h-40 text-[13px]" style={{ color:'var(--text-3)' }}>Deal not found</div>

  const isOpen  = deal.status === 'open'
  const currency= deal.currency ?? 'USD'
  const owner   = users.find((u: any) => u.id === deal.ownerId)

  const statusColor = ({ open:'#4C8BF5', won:'#10B981', lost:'#E4483F' } as Record<string, string>)[deal.status] ?? '#98A2B3'

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate('/pipeline')}
          className="flex items-center gap-1.5 text-[12px] transition-colors"
          style={{ color:'var(--text-3)' }}>
          <ArrowLeft size={14} /> Pipeline
        </button>
        <span style={{ color:'var(--border)' }}>/</span>
        <span className="text-[12px] font-medium truncate" style={{ color:'var(--text)' }}>{deal.title}</span>
        <Badge color={statusColor}>{deal.status}</Badge>
      </div>

      {/* Stage progress */}
      {deal.stageHistory?.length > 0 && (
        <div className="flex items-center gap-0 flex-shrink-0">
          {[...new Set((deal.stageHistory ?? []).map((h: any) => h.stage))].map((s: any, i: number, arr: any[]) => {
            const isCurrent = s === deal.stage || i === arr.length - 1
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                  style={{ background: isCurrent ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)', color: isCurrent ? 'var(--green)' : 'var(--text-3)', border: `1px solid ${isCurrent ? 'rgba(16,185,129,0.3)' : 'var(--border)'}` }}>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full" style={{ background:'var(--green)' }} />}
                  {s}
                </div>
                {i < arr.length - 1 && <div className="w-4 h-px mx-1" style={{ background:'var(--border)' }} />}
              </div>
            )
          })}
        </div>
      )}

      {/* Body: left sidebar + right feed */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT ── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Deal info */}
          <Card>
            <CardHeader title={deal.title} />
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <DollarSign size={14} style={{ color:'var(--text-3)', flexShrink:0 }} />
                <span className="text-[20px] font-bold" style={{ color:'var(--green)' }}>
                  {formatCurrency(deal.value, currency)}
                </span>
              </div>
              {owner && (
                <div className="flex items-center gap-2">
                  <User size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  <span className="text-[12.5px]" style={{ color:'var(--text)' }}>{owner.name}</span>
                  <Badge color="#4C8BF5">{owner.role}</Badge>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  <span className="text-[12.5px]" style={{ color:'var(--text-3)' }}>Close by {formatDate(deal.expectedCloseDate)}</span>
                </div>
              )}
              {deal.lostReason && (
                <div className="text-[12px] px-3 py-2 rounded-[8px]"
                  style={{ background:'rgba(228,72,63,0.08)', color:'#E4483F', border:'1px solid rgba(228,72,63,0.2)' }}>
                  Lost: {deal.lostReason}
                </div>
              )}
            </div>
          </Card>

          {/* Next action */}
          <Card padding="16px">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider mb-3" style={{ color:'var(--text-3)' }}>Next action</div>
            <NextActionWidget
              dealId={deal.id}
              nextAction={deal.nextAction}
              slaStatus={deal.slaStatus as SlaStatus}
              canWrite={canWrite && isOpen}
            />
          </Card>

          {/* Won/Lost buttons */}
          {isOpen && canWrite && (
            <div className="flex gap-2">
              <Button onClick={() => setClosing('won')} size="sm" className="flex-1">
                <Trophy size={12} /> Won
              </Button>
              <Button onClick={() => setClosing('lost')} variant="danger" size="sm" className="flex-1">
                <XCircle size={12} /> Lost
              </Button>
            </div>
          )}

          {/* Stage history */}
          {deal.stageHistory?.length > 0 && (
            <Card>
              <CardHeader title="Stage history" />
              <div className="p-4 flex flex-col gap-0">
                {[...(deal.stageHistory ?? [])].reverse().map((h: any, i: number) => (
                  <div key={i} className="flex justify-between py-2 text-[12px]"
                    style={{ borderBottom: i < deal.stageHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ color:'var(--text)' }}>{h.stage}</span>
                    <span style={{ color:'var(--text-3)' }}>{formatDate(h.movedAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader title="Documents" />
            <div className="p-4">
              <DocumentsPanel relatedTo={{ type:'deal', id:deal.id }} canWrite={canWrite && isOpen} />
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Activity feed ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Card className="flex flex-col flex-1 overflow-hidden">
            <CardHeader title="Activity" action={
              <span className="text-[11px]" style={{ color:'var(--text-3)' }}>
                {isOpen ? 'Live updates enabled' : `Deal ${deal.status}`}
              </span>
            } />
            <div className="flex flex-col flex-1 overflow-hidden">
              {canWrite && isOpen && (
                <div className="p-4" style={{ borderBottom:'1px solid var(--border)' }}>
                  <ActivityComposer
                    relatedTo={{ type:'deal', id:deal.id }}
                    tenantUsers={users.map((u: any) => ({ id:u.id, name:u.name }))}
                  />
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <ActivityFeed relatedTo={{ type:'deal', id:deal.id }} canWrite={canWrite} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Won modal */}
      <Modal open={closing==='won'} onClose={() => setClosing(null)} title="Mark deal as Won 🎉">
        <div className="flex flex-col gap-4">
          <p className="text-[13px]" style={{ color:'var(--text-3)' }}>
            Marking <strong style={{ color:'var(--text)' }}>{deal.title}</strong> as won. This clears the follow-up schedule.
          </p>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setClosing(null)} className="flex-1">Cancel</Button>
            <Button loading={closeMut.isPending} onClick={() => closeMut.mutate({ status:'won' })} className="flex-1">
              <Trophy size={13} /> Confirm won
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lost modal */}
      <Modal open={closing==='lost'} onClose={() => setClosing(null)} title="Mark deal as Lost">
        <div className="flex flex-col gap-4">
          <p className="text-[13px]" style={{ color:'var(--text-3)' }}>
            What happened with <strong style={{ color:'var(--text)' }}>{deal.title}</strong>?
          </p>
          <Input label="Loss reason *" placeholder="e.g. went with competitor, budget cut, no decision..."
            value={lostReason} onChange={e => setLostReason(e.target.value)} autoFocus />
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setClosing(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" loading={closeMut.isPending} disabled={!lostReason.trim()}
              onClick={() => closeMut.mutate({ status:'lost', lostReason })} className="flex-1">
              <XCircle size={13} /> Confirm lost
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
