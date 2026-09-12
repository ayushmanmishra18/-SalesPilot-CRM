import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { usersApi, newIdempotencyKey } from '../../api'
import { Button, Card, Modal, ConfirmModal, Input, Select, Spinner, Badge } from '../../components/ui'
import { toast } from '../../components/ui/Toast'
import { formatRelativeTime } from '../../utils/sla'
import { useAuthStore } from '../../store/auth'

const ROLE_COLORS: Record<string, string> = {
  admin:  'var(--green)',
  member: '#4C8BF5',
  viewer: '#98A2B3',
}

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member — can create and edit' },
  { value: 'admin',  label: 'Admin — full access' },
  { value: 'viewer', label: 'Viewer — read only' },
]

export default function UsersPage() {
  const queryClient = useQueryClient()
  const myId        = useAuthStore(s => s.user?.userId)
  const role        = useAuthStore(s => s.user?.role)
  const isAdmin     = role === 'admin'

  const [inviting,    setInviting]    = useState(false)
  const [form,        setForm]        = useState({ name: '', email: '', role: 'member' })
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [copied,      setCopied]      = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [removing,    setRemoving]    = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => usersApi.list().then(r => r.data),
  })

  const inviteMut = useMutation({
    mutationFn: () => usersApi.invite(form as any, newIdempotencyKey()),
    onSuccess:  (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setInviteToken(res.data.inviteToken)
      setForm({ name: '', email: '', role: 'member' })
      setErrors({})
    },
    onError: (err: any) => setErrors(err.response?.data?.error?.details ?? {}),
  })

  const removeMut = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User removed'); setRemoving(null) },
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Role updated') },
  })

  if (isLoading) return <Spinner />
  const users  = data?.users ?? []
  const active = users.filter((u: any) => u.status === 'active')
  const invited = users.filter((u: any) => u.status === 'invited')

  function copyInviteLink() {
    const url = `${window.location.origin}/accept-invite?token=${inviteToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Team</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{active.length} active · {invited.length} pending invite</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviting(true)}>
            <Plus size={13} /> Invite member
          </Button>
        )}
      </div>

      <Card>
        <table>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              {['Member', 'Role', 'Status', 'Joined', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10.5px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient flex-shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{u.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                        {u.name}
                        {u.id === myId && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green)' }}>you</span>}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {isAdmin && u.id !== myId ? (
                    <select value={u.role}
                      onChange={e => roleMut.mutate({ id: u.id, role: e.target.value })}
                      style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: 12 }}>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <Badge color={ROLE_COLORS[u.role]}>{u.role}</Badge>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: u.status === 'active' ? 'rgba(47,174,96,0.12)' : 'rgba(245,165,36,0.12)',
                      color:      u.status === 'active' ? '#2FAE60' : '#F5A524',
                    }}>
                    {u.status === 'active' ? 'Active' : 'Invited'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                  {formatRelativeTime(u.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  {isAdmin && u.id !== myId && (
                    <button onClick={() => setRemoving({ id: u.id, name: u.name })} aria-label={`Remove ${u.name}`}
                      className="transition-colors" style={{ color: 'var(--text-3)' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Invite modal */}
      <Modal open={inviting && !inviteToken} onClose={() => { setInviting(false); setInviteToken('') }} title="Invite team member">
        <div className="flex flex-col gap-3.5">
          <Input label="Full name *" placeholder="Ravi Kumar"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            error={errors['name']} />
          <Input label="Email address *" type="email" placeholder="ravi@company.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors['email']} />
          <Select label="Role" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={ROLE_OPTIONS} />
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={() => setInviting(false)} className="flex-1 justify-center">Cancel</Button>
            <Button loading={inviteMut.isPending} disabled={!form.name || !form.email}
              onClick={() => inviteMut.mutate()} className="flex-1 justify-center">
              Send invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite link modal */}
      <Modal open={!!inviteToken} onClose={() => { setInviting(false); setInviteToken('') }} title="Invite sent ✓">
        <div className="flex flex-col gap-4">
          <p className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>
            An invite email has been sent. You can also share this link directly:
          </p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-[9px] px-3 py-2 text-[12px] font-mono truncate"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--green)' }}>
              {`${window.location.origin}/accept-invite?token=${inviteToken}`}
            </div>
            <Button size="sm" variant="ghost" onClick={copyInviteLink}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </Button>
          </div>
          <div className="text-[11px] px-3 py-2 rounded-lg" style={{ background: 'rgba(245,165,36,0.08)', color: '#F5A524', border: '1px solid rgba(245,165,36,0.25)' }}>
            ⚠ Link expires in 7 days. Only share via secure channels.
          </div>
          <Button onClick={() => { setInviting(false); setInviteToken('') }} className="w-full justify-center">Done</Button>
        </div>
      </Modal>

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)}
        onConfirm={() => removeMut.mutate(removing!.id)}
        loading={removeMut.isPending}
        title="Remove team member?"
        description={<>This will revoke <strong style={{ color: 'var(--text)' }}>{removing?.name}</strong>'s access to this workspace immediately. This can't be undone.</>}
        confirmLabel="Remove member" />
    </div>
  )
}
