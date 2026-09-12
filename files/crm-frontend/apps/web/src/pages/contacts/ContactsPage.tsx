import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, ChevronRight, UserCircle } from 'lucide-react'
import { contactsApi, newIdempotencyKey } from '../../api'
import { Button, Input, Select, Modal, ConfirmModal, EmptyState, Spinner, SlaPill, Badge } from '../../components/ui'
import { toast } from '../../components/ui/Toast'
import type { SlaStatus } from '../../utils/sla'
import { formatRelativeTime } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'

const LEAD_STATUS_OPTIONS = [
  { value: '',           label: 'All statuses' },
  { value: 'new',        label: 'New' },
  { value: 'contacted',  label: 'Contacted' },
  { value: 'qualified',  label: 'Qualified' },
  { value: 'nurturing',  label: 'Nurturing' },
  { value: 'converted',  label: 'Converted' },
  { value: 'disqualified',label: 'Disqualified' },
]

const SOURCE_OPTIONS = [
  { value: '',           label: 'All sources' },
  { value: 'website',    label: 'Website' },
  { value: 'referral',   label: 'Referral' },
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'event',      label: 'Event' },
  { value: 'social',     label: 'Social media' },
  { value: 'other',      label: 'Other' },
]

const LEAD_STATUS_COLOR: Record<string, string> = {
  new:          '#4C8BF5',
  contacted:    '#F5A524',
  qualified:    '#10B981',
  nurturing:    '#A855F7',
  converted:    '#2FAE60',
  disqualified: '#98A2B3',
}

export default function ContactsPage() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()
  const role        = useAuthStore(s => s.user?.role)
  const canWrite    = role === 'admin' || role === 'member'

  const [qInput,     setQInput]     = useState('') // what the user is typing, updates every keystroke
  const [q,          setQ]          = useState('') // debounced value actually sent to the API
  const [leadStatus, setLeadStatus] = useState('')
  const [source,     setSource]     = useState('')
  const [adding,     setAdding]     = useState(false)
  const [form,       setForm]       = useState({
    name: '', email: '', phone: '', company: '', jobTitle: '',
    leadStatus: 'new', source: '', notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  // Debounce search input — don't fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 350)
    return () => clearTimeout(t)
  }, [qInput])

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', q, leadStatus, source],
    queryFn:  () => contactsApi.list({ q: q || undefined, source: source || undefined, leadStatus: leadStatus || undefined }).then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (d: any) => contactsApi.create(d, newIdempotencyKey()),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setAdding(false)
      setForm({ name: '', email: '', phone: '', company: '', jobTitle: '', leadStatus: 'new', source: '', notes: '' })
      toast.success('Contact added')
    },
    onError: (err: any) => setErrors(err.response?.data?.error?.details ?? {}),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Contact removed'); setDeleting(null) },
  })

  if (isLoading) return <Spinner />
  const contacts = data?.contacts ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Contacts</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{contacts.length} contacts</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={13} /> Add contact
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 max-w-xs rounded-[9px] px-3 py-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-3)]"
            style={{ color: 'var(--text)' }}
            placeholder="Search name, email, company..."
            value={qInput}
            onChange={e => setQInput(e.target.value)}
          />
        </div>
        <select value={leadStatus} onChange={e => setLeadStatus(e.target.value)} style={{ width: 150 }}>
          {LEAD_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={source} onChange={e => setSource(e.target.value)} style={{ width: 150 }}>
          {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {contacts.length === 0 ? (
        <EmptyState icon={<UserCircle />} title="No contacts yet"
          description="Add your first contact to start tracking your pipeline"
          action={canWrite ? <Button size="sm" onClick={() => setAdding(true)}><Plus size={13} /> Add contact</Button> : undefined} />
      ) : (
        <div className="rounded-[12px] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['Contact', 'Company', 'Lead status', 'Source', 'Follow-up', 'Last activity', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => (
                <tr key={c.id} className="cursor-pointer transition-colors"
                  style={{ borderTop: '1px solid var(--border)' }}
                  onClick={() => navigate(`/contacts/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full gradient flex-shrink-0 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{c.name[0]}</span>
                      </div>
                      <div>
                        <div className="text-[12.5px] font-semibold" style={{ color: 'var(--text)' }}>{c.name}</div>
                        {c.email && <div className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px]" style={{ color: 'var(--text)' }}>{c.company ?? '—'}</div>
                    {c.jobTitle && <div className="text-[10.5px]" style={{ color: 'var(--text-3)' }}>{c.jobTitle}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.leadStatus ? (
                      <Badge color={LEAD_STATUS_COLOR[c.leadStatus] ?? '#98A2B3'}>
                        {c.leadStatus}
                      </Badge>
                    ) : <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                    {c.source ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.nextAction ? <SlaPill status={c.slaStatus as SlaStatus} />
                      : <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
                    {formatRelativeTime(c.updatedAt)}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
                      {canWrite && (
                        <button className="transition-colors" aria-label={`Remove ${c.name}`}
                          style={{ color: 'var(--text-3)' }}
                          onClick={e => { e.stopPropagation(); setDeleting({ id: c.id, name: c.name }) }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add contact modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add contact" width="520px">
        <div className="flex flex-col gap-3.5">
          <Input label="Full name *" placeholder="Priya Shah" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors['name']} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" placeholder="priya@company.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors['email']} />
            <Input label="Phone" placeholder="+91 99999 99999" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" placeholder="Acme Corp" value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            <Input label="Job title" placeholder="VP Sales" value={form.jobTitle}
              onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Lead status" value={form.leadStatus}
              onChange={e => setForm(f => ({ ...f, leadStatus: e.target.value }))}
              options={LEAD_STATUS_OPTIONS.filter(o => o.value)} />
            <Select label="Source" value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              options={[{ value: '', label: 'Unknown' }, ...SOURCE_OPTIONS.filter(o => o.value)]} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAdding(false)} className="flex-1 justify-center">Cancel</Button>
            <Button loading={createMut.isPending} disabled={!form.name.trim()}
              onClick={() => createMut.mutate(form)} className="flex-1 justify-center">
              Add contact
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleteMut.mutate(deleting!.id)}
        loading={deleteMut.isPending}
        title="Remove contact?"
        description={<>This will permanently remove <strong style={{ color: 'var(--text)' }}>{deleting?.name}</strong> and all of their linked activity. This can't be undone.</>}
        confirmLabel="Remove contact" />
    </div>
  )
}
