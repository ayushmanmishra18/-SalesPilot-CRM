import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, Building2, Briefcase, TrendingUp } from 'lucide-react'
import { contactsApi, dealsApi, usersApi } from '../../api'
import { Card, CardHeader, Spinner, SlaPill, Badge } from '../../components/ui'
import { ActivityComposer } from '../../components/activity/ActivityComposer'
import { ActivityFeed } from '../../components/activity/ActivityFeed'
import { DocumentsPanel } from '../../components/deal/DocumentsPanel'
import { formatCurrency, type SlaStatus } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'

const LEAD_STATUS_COLOR: Record<string, string> = {
  new:'#4C8BF5', contacted:'#F5A524', qualified:'#10B981',
  nurturing:'#A855F7', converted:'#2FAE60', disqualified:'#98A2B3',
}

export default function ContactDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const role     = useAuthStore(s => s.user?.role)
  const canWrite = role === 'admin' || role === 'member'

  const { data: contactData, isLoading } = useQuery({ queryKey:['contact',id], queryFn:() => contactsApi.get(id!).then(r=>r.data), enabled:!!id })
  const { data: dealsData }              = useQuery({ queryKey:['contact-deals',id], queryFn:() => dealsApi.list().then(r=>r.data), enabled:!!id })
  const { data: usersData }              = useQuery({ queryKey:['users'], queryFn:() => usersApi.list().then(r=>r.data) })

  if (isLoading) return <Spinner />
  const contact     = contactData?.contact
  const linkedDeals = (dealsData?.deals ?? []).filter((d: any) => d.contactId === id)
  const users       = usersData?.users ?? []
  if (!contact) return <div className="flex items-center justify-center h-40 text-[13px]" style={{ color:'var(--text-3)' }}>Contact not found</div>

  const totalValue = linkedDeals.reduce((s: number, d: any) => s + d.value, 0)
  const currency   = linkedDeals[0]?.currency ?? 'USD'

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => navigate('/contacts')}
          className="flex items-center gap-1.5 text-[12px] transition-colors"
          style={{ color:'var(--text-3)' }}>
          <ArrowLeft size={14} /> Contacts
        </button>
        <span style={{ color:'var(--border)' }}>/</span>
        <span className="text-[12px] font-medium" style={{ color:'var(--text)' }}>{contact.name}</span>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* ── LEFT sidebar ── */}
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Profile card */}
          <Card>
            <div className="p-5 flex flex-col items-center text-center" style={{ borderBottom:'1px solid var(--border)' }}>
              <div className="w-14 h-14 rounded-full gradient glow flex items-center justify-center mb-3">
                <span className="text-[20px] font-bold text-white">{contact.name[0]}</span>
              </div>
              <div className="font-bold text-[15px] mb-1" style={{ color:'var(--text)' }}>{contact.name}</div>
              {contact.jobTitle && <div className="text-[12px] mb-2" style={{ color:'var(--text-3)' }}>{contact.jobTitle}</div>}
              <div className="flex gap-2 flex-wrap justify-center">
                {contact.leadStatus && <Badge color={LEAD_STATUS_COLOR[contact.leadStatus] ?? '#98A2B3'}>{contact.leadStatus}</Badge>}
                {contact.source && <Badge color="#98A2B3">{contact.source}</Badge>}
              </div>
            </div>

            <div className="p-4 flex flex-col gap-2.5">
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="flex items-center gap-2.5 text-[12.5px] hover:opacity-80"
                  style={{ color:'var(--text)' }}>
                  <Mail size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2.5 text-[12.5px]" style={{ color:'var(--text)' }}>
                  <Phone size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  {contact.phone}
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2.5 text-[12.5px]" style={{ color:'var(--text)' }}>
                  <Building2 size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  {contact.company}
                </div>
              )}
              {contact.jobTitle && (
                <div className="flex items-center gap-2.5 text-[12.5px]" style={{ color:'var(--text)' }}>
                  <Briefcase size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
                  {contact.jobTitle}
                </div>
              )}
            </div>

            {contact.nextAction && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[9px]"
                  style={{ background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  <SlaPill status={contact.slaStatus as SlaStatus} />
                  <span className="text-[12px] truncate" style={{ color:'var(--text)' }}>{contact.nextAction.text}</span>
                </div>
              </div>
            )}
          </Card>

          {/* Deals */}
          <Card>
            <CardHeader title={`Deals (${linkedDeals.length})`} action={
              <span className="text-[11px] font-medium" style={{ color:'var(--green)' }}>
                {formatCurrency(totalValue, currency)}
              </span>
            } />
            <div className="p-3 flex flex-col gap-1.5">
              {linkedDeals.length === 0 ? (
                <div className="py-6 text-center text-[12px]" style={{ color:'var(--text-3)' }}>No deals yet</div>
              ) : linkedDeals.map((d: any) => (
                <button key={d.id} onClick={() => navigate(`/deals/${d.id}`)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-left w-full transition-colors"
                  style={{ background:'var(--surface-2)', border:'1px solid var(--border)' }}>
                  <TrendingUp size={12} style={{ color:'var(--green)', flexShrink:0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate" style={{ color:'var(--text)' }}>{d.title}</div>
                    <div className="text-[11px]" style={{ color:'var(--text-3)' }}>{d.stage}</div>
                  </div>
                  <div className="text-[12px] font-semibold flex-shrink-0" style={{ color:'var(--green)' }}>
                    {formatCurrency(d.value, currency)}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader title="Documents" />
            <div className="p-4">
              <DocumentsPanel relatedTo={{ type:'contact', id:contact.id }} canWrite={canWrite} />
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Activity feed ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Card className="flex flex-col flex-1 overflow-hidden">
            <CardHeader title="Activity timeline" />
            <div className="flex flex-col flex-1 overflow-hidden">
              {canWrite && (
                <div className="p-4" style={{ borderBottom:'1px solid var(--border)' }}>
                  <ActivityComposer
                    relatedTo={{ type:'contact', id:contact.id }}
                    tenantUsers={users.map((u: any) => ({ id:u.id, name:u.name }))}
                  />
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <ActivityFeed relatedTo={{ type:'contact', id:contact.id }} canWrite={canWrite} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
