import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, List, Trophy, XCircle } from 'lucide-react'
import { dealsApi, settingsApi, newIdempotencyKey } from '../../api'
import { Button, Modal, Input, Select, EmptyState, Spinner, SlaPill, Card } from '../../components/ui'
import { toast } from '../../components/ui/Toast'
import type { SlaStatus } from '../../utils/sla'
import { formatCurrency } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'

export default function PipelinePage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const role        = useAuthStore(s => s.user?.role)
  const canWrite    = role === 'admin' || role === 'member'

  const [view,     setView]     = useState<'board'|'list'>('board')
  const [adding,   setAdding]   = useState(false)
  const [dragDeal, setDragDeal] = useState<any>(null)
  const [form,     setForm]     = useState({ title: '', value: '', stage: '', contactId: '' })
  const [closing,  setClosing]  = useState<{id:string;title:string;mode:'won'|'lost'}|null>(null)
  const [lostReason, setLostReason] = useState('')

  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get().then(r => r.data) })
  const { data: openData, isLoading } = useQuery({ queryKey: ['deals','open'], queryFn: () => dealsApi.list({ status: 'open' }).then(r => r.data) })
  const { data: wonData }  = useQuery({ queryKey: ['deals','won'],  queryFn: () => dealsApi.list({ status: 'won' }).then(r => r.data) })

  const tenant   = settingsData?.tenant
  const stages   = tenant?.stages ?? [{ name:'New',order:0,isTerminal:false },{ name:'Contacted',order:1,isTerminal:false },{ name:'Proposal',order:2,isTerminal:false },{ name:'Negotiation',order:3,isTerminal:false }]
  const nonTerminal = stages.filter((s: any) => !s.isTerminal).sort((a: any, b: any) => a.order - b.order)
  const stageNames  = nonTerminal.map((s: any) => s.name)

  const deals    = openData?.deals ?? []
  const wonDeals = wonData?.deals  ?? []
  const currency = deals[0]?.currency ?? wonDeals[0]?.currency ?? (tenant?.currency ?? 'USD')

  const allCols  = [...stageNames, 'Won']

  const createMut = useMutation({
    mutationFn: (d: any) => dealsApi.create(d, newIdempotencyKey()),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); setAdding(false); setForm({ title:'',value:'',stage:'',contactId:'' }); toast.success('Deal created') },
  })
  const moveMut = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => dealsApi.moveStage(id, stage),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  })
  const closeMut = useMutation({
    mutationFn: ({ id, status, lostReason }: any) => dealsApi.close(id, { status, lostReason }),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); setClosing(null); setLostReason('') },
  })

  if (isLoading) return <Spinner />

  const openValue = deals.reduce((s: number, d: any) => s + d.value, 0)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[16px] font-bold" style={{ color:'var(--text)' }}>Pipeline</h1>
          <p className="text-[12px] mt-0.5" style={{ color:'var(--text-3)' }}>
            {deals.length} open · {formatCurrency(openValue, currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-[8px] overflow-hidden" style={{ border:'1px solid var(--border)' }}>
            {([['board', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center justify-center w-8 h-8 transition-colors"
                style={{ background: view===v ? 'var(--green)' : 'var(--surface)', color: view===v ? '#fff' : 'var(--text-3)' }}>
                <Icon size={13} />
              </button>
            ))}
          </div>
          {canWrite && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={13} /> New deal
            </Button>
          )}
        </div>
      </div>

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-3 flex-1 min-h-0" style={{ alignItems:'flex-start' }}>
          {allCols.map(col => {
            const isWon     = col === 'Won'
            const colDeals  = isWon ? wonDeals : deals.filter((d: any) => d.stage === col)
            const colValue  = colDeals.reduce((s: number, d: any) => s + d.value, 0)
            return (
              <div key={col} className="flex-shrink-0 flex flex-col rounded-[12px] overflow-hidden"
                style={{ width:230, background:'var(--surface)', border:`1px solid ${isWon?'rgba(16,185,129,0.4)':'var(--border)'}`, boxShadow:isWon?'0 0 16px rgba(16,185,129,0.08)':'none', maxHeight:'calc(100vh - 200px)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => canWrite && dragDeal && !isWon && moveMut.mutate({ id: dragDeal.id, stage: col })}>

                {/* Col header */}
                <div className="px-3.5 py-2.5 flex-shrink-0"
                  style={{ background: isWon ? 'linear-gradient(135deg,#10B981,#059669)' : 'var(--surface-2)', borderBottom:`1px solid ${isWon?'rgba(255,255,255,0.15)':'var(--border)'}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold" style={{ color: isWon?'#fff':'var(--text)' }}>{col}</span>
                    <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: isWon?'rgba(255,255,255,0.2)':'var(--border)', color: isWon?'#fff':'var(--text-3)' }}>
                      {colDeals.length}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: isWon?'rgba(255,255,255,0.75)':'var(--text-3)' }}>
                    {formatCurrency(colValue, currency)}
                  </div>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
                  {colDeals.map((deal: any) => (
                    <div key={deal.id}
                      draggable={canWrite && !isWon}
                      onDragStart={() => setDragDeal(deal)}
                      onDragEnd={() => setDragDeal(null)}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      className="rounded-[10px] p-3 cursor-pointer transition-all hover:translate-y-[-1px]"
                      style={{ background:'var(--bg)', border:`1px solid ${deal.slaStatus==='overdue'?'rgba(228,72,63,0.4)':'var(--border)'}` }}>
                      <div className="text-[12.5px] font-semibold mb-1.5 leading-snug" style={{ color:'var(--text)' }}>
                        {deal.title}
                      </div>
                      <div className="text-[12px] font-medium mb-2" style={{ color:'var(--green)' }}>
                        {formatCurrency(deal.value, currency)}
                      </div>
                      <SlaPill status={deal.slaStatus as SlaStatus} />
                      {canWrite && !isWon && (
                        <div className="flex gap-1 mt-2 pt-2" style={{ borderTop:'1px solid var(--border)' }}>
                          <button className="flex-1 text-[10px] py-1 rounded-[6px] font-medium transition-colors flex items-center justify-center gap-1"
                            style={{ background:'rgba(16,185,129,0.1)',color:'var(--green)' }}
                            onClick={e => { e.stopPropagation(); setClosing({ id:deal.id, title:deal.title, mode:'won' }) }}>
                            <Trophy size={10} /> Won
                          </button>
                          <button className="flex-1 text-[10px] py-1 rounded-[6px] font-medium transition-colors flex items-center justify-center gap-1"
                            style={{ background:'rgba(228,72,63,0.1)',color:'#E4483F' }}
                            onClick={e => { e.stopPropagation(); setClosing({ id:deal.id, title:deal.title, mode:'lost' }) }}>
                            <XCircle size={10} /> Lost
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!isWon && colDeals.length === 0 && (
                    <div className="flex items-center justify-center h-16 rounded-[9px] text-[11.5px]"
                      style={{ border:'1.5px dashed var(--border)', color:'var(--text-3)' }}>
                      Drop here
                    </div>
                  )}
                  {!isWon && canWrite && (
                    <button onClick={() => { setForm(f=>({...f,stage:col})); setAdding(true) }}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[11.5px] transition-colors w-full"
                      style={{ border:'1.5px dashed var(--border)', color:'var(--text-3)' }}>
                      <Plus size={12} /> Add deal
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <Card>
          {deals.length === 0 ? (
            <EmptyState icon="📋" title="No open deals" description="Create your first deal to get started"
              action={canWrite ? <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> New deal</Button> : undefined} />
          ) : (
            <table>
              <thead>
                <tr style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
                  {['Deal','Stage','Value','Follow-up','Owner',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wide"
                      style={{ color:'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deals.map((d: any) => (
                  <tr key={d.id} className="cursor-pointer" style={{ borderTop:'1px solid var(--border)' }}
                    onClick={() => navigate(`/deals/${d.id}`)}>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold" style={{ color:'var(--text)' }}>{d.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11.5px] px-2 py-0.5 rounded-full" style={{ background:'var(--surface-2)', color:'var(--text)', border:'1px solid var(--border)' }}>{d.stage}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium" style={{ color:'var(--green)' }}>
                      {formatCurrency(d.value, currency)}
                    </td>
                    <td className="px-4 py-3"><SlaPill status={d.slaStatus as SlaStatus} /></td>
                    <td className="px-4 py-3 text-[12px]" style={{ color:'var(--text-3)' }}>{d.ownerId?.slice(-6)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[11px]" style={{ color:'var(--text-3)' }}>→</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Add deal modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="New deal">
        <div className="flex flex-col gap-4">
          <Input label="Deal title *" placeholder="Acme Corp — Enterprise plan"
            value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Value" type="number" min="0" placeholder="50000"
              value={form.value} onChange={e => setForm(f=>({...f,value:e.target.value}))} />
            <Select label="Stage" value={form.stage || stageNames[0]}
              onChange={e => setForm(f=>({...f,stage:e.target.value}))}
              options={stageNames.map(s => ({ value:s, label:s }))} />
          </div>
          <div className="flex gap-2.5 pt-1">
            <Button variant="ghost" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
            <Button loading={createMut.isPending} disabled={!form.title.trim()}
              onClick={() => createMut.mutate({ title:form.title, value:+(form.value||0), stage:form.stage||stageNames[0] })}
              className="flex-1">
              Create deal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close deal modals */}
      <Modal open={closing?.mode==='won'} onClose={() => setClosing(null)} title="Mark as Won 🎉">
        <div className="flex flex-col gap-4">
          <p className="text-[13px]" style={{ color:'var(--text-3)' }}>
            Marking <strong style={{ color:'var(--text)' }}>{closing?.title}</strong> as won. This will clear the follow-up schedule.
          </p>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setClosing(null)} className="flex-1">Cancel</Button>
            <Button loading={closeMut.isPending}
              onClick={() => closeMut.mutate({ id:closing!.id, status:'won' })}
              className="flex-1">
              <Trophy size={13} /> Confirm won
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={closing?.mode==='lost'} onClose={() => setClosing(null)} title="Mark as Lost">
        <div className="flex flex-col gap-4">
          <p className="text-[13px]" style={{ color:'var(--text-3)' }}>
            What happened with <strong style={{ color:'var(--text)' }}>{closing?.title}</strong>?
          </p>
          <Input label="Loss reason *" placeholder="e.g. went with competitor, budget cut..."
            value={lostReason} onChange={e => setLostReason(e.target.value)} autoFocus />
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setClosing(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" loading={closeMut.isPending} disabled={!lostReason.trim()}
              onClick={() => closeMut.mutate({ id:closing!.id, status:'lost', lostReason })}
              className="flex-1">
              <XCircle size={13} /> Confirm lost
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
