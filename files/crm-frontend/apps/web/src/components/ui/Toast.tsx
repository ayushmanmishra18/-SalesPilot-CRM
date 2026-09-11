import { create } from 'zustand'
import { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: string; type: ToastType; message: string }

interface ToastStore {
  toasts: Toast[]
  add:    (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message) => {
    const id = crypto.randomUUID()
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = {
  success: (m: string) => useToastStore.getState().add('success', m),
  error:   (m: string) => useToastStore.getState().add('error', m),
  info:    (m: string) => useToastStore.getState().add('info', m),
}

const ICON = { success: CheckCircle2, error: XCircle, info: AlertCircle }
const COLOR = { success: '#2FAE60', error: '#E4483F', info: '#4C8BF5' }

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const Icon = ICON[t.type]
        const color = COLOR[t.type]
        return (
          <div key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-[10px] pointer-events-auto animate-in"
            style={{ background: 'var(--surface)', border: `1px solid ${color}44`, boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${color}22`, minWidth: 260, maxWidth: 360 }}>
            <Icon size={15} style={{ color, flexShrink: 0 }} />
            <span className="text-[12.5px] text-[var(--text)] flex-1 leading-snug">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-[var(--text-3)] hover:text-[var(--text)] flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
