import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, X } from 'lucide-react'
import { dealsApi } from '../../api'
import { SlaPill } from '../ui'
import { formatDate, type SlaStatus } from '../../utils/sla'

interface Props {
  dealId:     string
  nextAction: { text: string; dueDate: string; setBy: string; setAt: string } | null
  slaStatus:  SlaStatus
  canWrite:   boolean
}

export function NextActionWidget({ dealId, nextAction, slaStatus, canWrite }: Props) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [text,    setText]    = useState(nextAction?.text ?? '')
  const [dueDate, setDueDate] = useState(
    nextAction?.dueDate ? new Date(nextAction.dueDate).toISOString().slice(0, 16) : ''
  )

  const setMut = useMutation({
    mutationFn: (data: { text: string; dueDate: string }) =>
      dealsApi.setAction(dealId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] })
      queryClient.invalidateQueries({ queryKey: ['followups'] })
      setEditing(false)
    },
  })

  function handleSave() {
    if (!text.trim() || !dueDate) return
    setMut.mutate({ text: text.trim(), dueDate: new Date(dueDate).toISOString() })
  }

  const accentColor =
    slaStatus === 'overdue'   ? '#E4483F' :
    slaStatus === 'due_today' ? '#F5A524' :
    'var(--green)'

  if (!nextAction && !editing) {
    return (
      <div className="rounded-[10px] p-3"
        style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
        <div className="text-[11px] text-[var(--text-3)] mb-2">No follow-up scheduled</div>
        {canWrite && (
          <button onClick={() => setEditing(true)}
            className="text-[11px] text-[var(--green)] hover:opacity-80 font-medium">
            + Set next action
          </button>
        )}
      </div>
    )
  }

  if (editing) {
    return (
      <div className="rounded-[10px] p-3 flex flex-col gap-2"
        style={{ background: 'var(--bg)', border: `1px solid ${accentColor}55` }}>
        <input
          autoFocus
          className="w-full bg-transparent text-[12.5px] text-[var(--text)] placeholder:text-[var(--text-3)] outline-none"
          placeholder="What needs to happen next?"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <input type="datetime-local" value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11.5px] text-[var(--text)] outline-none" />
          <button onClick={handleSave} disabled={!text.trim() || !dueDate || setMut.isPending}
            className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white gradient disabled:opacity-50"
            style={{ boxShadow: '0 0 8px rgba(16,185,129,0.3)' }}>
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-[var(--text-3)] hover:text-[var(--text)]">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[10px] p-3"
      style={{ background: `${accentColor}0D`, border: `1px solid ${accentColor}44` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: accentColor }}>
            Next action
          </div>
          <div className="text-[12.5px] text-[var(--text)] leading-snug mb-2">
            {nextAction!.text}
          </div>
          <div className="flex items-center gap-2">
            <SlaPill status={slaStatus} />
            <span className="text-[10px] text-[var(--text-3)] flex items-center gap-1">
              <Calendar size={10} />
              {formatDate(nextAction!.dueDate)}
            </span>
          </div>
        </div>
        {canWrite && (
          <button onClick={() => { setText(nextAction!.text); setDueDate(new Date(nextAction!.dueDate).toISOString().slice(0, 16)); setEditing(true) }}
            className="text-[10px] text-[var(--green)] hover:opacity-80 flex-shrink-0 mt-0.5">
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
