import React, { useEffect, useRef, useState } from 'react'
import type { SlaStatus } from '../../utils/sla'
import { SLA_LABELS, SLA_COLORS } from '../../utils/sla'

/* ══════ BUTTON ══════ */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary'|'ghost'|'danger'|'soft'
  size?: 'xs'|'sm'|'md'|'lg'
  loading?: boolean
  icon?: React.ReactNode
}
export function Button({ variant='primary', size='md', loading, icon, children, className='', ...p }: BtnProps) {
  const h = { xs:'h-6 px-2.5 text-[11px] gap-1', sm:'h-8 px-3 text-[12px] gap-1.5', md:'h-9 px-4 text-[13px] gap-2', lg:'h-10 px-5 text-[13.5px] gap-2' }[size]
  const v = {
    primary: 'g gl text-white hover:opacity-90 active:scale-[.98]',
    ghost:   'border border-[var(--border-2)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--green)] bg-transparent',
    danger:  'bg-[#E4483F12] border border-[#E4483F35] text-[#E4483F] hover:bg-[#E4483F1E]',
    soft:    'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]',
  }[variant]
  return (
    <button className={`inline-flex items-center justify-center font-semibold rounded-[9px] transition-all select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap ${h} ${v} ${className}`}
      disabled={loading||p.disabled} {...p}>
      {loading
        ? <span style={{width:13,height:13,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .65s linear infinite',flexShrink:0,display:'inline-block'}}/>
        : icon}
      {children}
    </button>
  )
}

/* ══════ INPUT ══════ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; icon?: React.ReactNode
}
export function Input({ label, error, hint, icon, className='', style, ...p }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{label}</label>}
      <div className="relative flex items-center">
        {icon && <div className="absolute left-3 flex items-center pointer-events-none" style={{color:'var(--text-3)'}}>{icon}</div>}
        <input {...p} className={`w-full rounded-[9px] text-[13px] outline-none transition-all h-9 ${icon?'pl-9':'pl-3'} pr-3 ${className}`}
          style={{background:'var(--input)',border:`1.5px solid ${error?'#E4483F55':'var(--border-2)'}`,color:'var(--text)',...style}}
          onFocus={e=>{e.currentTarget.style.borderColor=error?'#E4483F':'var(--green)';p.onFocus?.(e)}}
          onBlur={e=>{e.currentTarget.style.borderColor=error?'#E4483F55':'var(--border-2)';p.onBlur?.(e)}}/>
      </div>
      {error&&<span className="text-[11px]" style={{color:'#E4483F'}}>{error}</span>}
      {hint&&!error&&<span className="text-[11px]" style={{color:'var(--text-3)'}}>{hint}</span>}
    </div>
  )
}

/* ══════ TEXTAREA ══════ */
interface TAProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?:string; error?:string }
export function Textarea({ label, error, className='', ...p }: TAProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label&&<label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{label}</label>}
      <textarea {...p} className={`w-full rounded-[9px] px-3 py-2.5 text-[13px] outline-none resize-none ${className}`}
        style={{background:'var(--input)',border:`1.5px solid ${error?'#E4483F55':'var(--border-2)'}`,color:'var(--text)',fontFamily:'inherit',...p.style}}/>
      {error&&<span className="text-[11px]" style={{color:'#E4483F'}}>{error}</span>}
    </div>
  )
}

/* ══════ SELECT WRAPPER ══════ */
interface SelProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?:string; error?:string; options:{value:string;label:string}[] }
export function Select({ label, error, options, className='', ...p }: SelProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label&&<label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{label}</label>}
      <select {...p} className={className} style={{border:`1.5px solid ${error?'#E4483F55':'var(--border-2)'}`, ...p.style}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error&&<span className="text-[11px]" style={{color:'#E4483F'}}>{error}</span>}
    </div>
  )
}

/* ══════ SLA PILL ══════ */
export function SlaPill({ status }: { status:SlaStatus }) {
  const c = SLA_COLORS[status]
  return <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{color:c,background:`${c}15`,border:`1px solid ${c}30`}}>{SLA_LABELS[status]}</span>
}

/* ══════ BADGE ══════ */
export function Badge({ children, color='var(--green)' }: { children:React.ReactNode; color?:string }) {
  return <span className="inline-flex items-center leading-none text-[10px] font-bold uppercase tracking-wide px-2.5 py-[5px] rounded-full whitespace-nowrap" style={{color,background:`${color}18`,border:`1px solid ${color}38`}}>{children}</span>
}

/* ══════ CARD ══════ */
export function Card({ children, className='', glow, onClick, padding }: {
  children:React.ReactNode; className?:string; glow?:boolean; onClick?:()=>void; padding?:string
}) {
  return (
    <div onClick={onClick} className={`rounded-[12px] overflow-hidden ${className}`}
      style={{background:'var(--surface)',border:`1px solid ${glow?'rgba(16,185,129,0.4)':'var(--border)'}`,boxShadow:glow?'0 0 28px rgba(16,185,129,0.10), inset 0 1px 0 rgba(16,185,129,0.1)':'none',cursor:onClick?'pointer':undefined,padding}}>
      {children}
    </div>
  )
}

/* ══════ CARD HEADER ══════ */
export function CardHeader({ title, action, sub }: { title:string; action?:React.ReactNode; sub?:string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5" style={{borderBottom:'1px solid var(--border)'}}>
      <div>
        <div className="text-[13px] font-semibold" style={{color:'var(--text)'}}>{title}</div>
        {sub&&<div className="text-[11px] mt-0.5" style={{color:'var(--text-3)'}}>{sub}</div>}
      </div>
      {action}
    </div>
  )
}

/* ══════ STAT CARD ══════ */
export function StatCard({ label, value, sub, icon:Icon, accent, trend }: {
  label:string; value:string|number; sub?:string; icon?:any; accent?:boolean; trend?:'up'|'down'
}) {
  return (
    <Card glow={accent} padding="18px 20px 20px">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-widest mb-2.5" style={{color:'var(--text-3)'}}>{label}</div>
          <div className="text-[24px] font-bold leading-none tracking-tight" style={{color:accent?'var(--green)':'var(--text)'}}>{value}</div>
          {sub&&<div className="text-[11px] mt-2 flex items-center gap-1" style={{color:'var(--text-3)'}}>
            {trend==='up'&&<span style={{color:'#10B981',fontSize:10}}>▲</span>}
            {trend==='down'&&<span style={{color:'#E4483F',fontSize:10}}>▼</span>}
            {sub}
          </div>}
        </div>
        {Icon&&<div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:accent?'rgba(16,185,129,0.12)':'var(--surface-2)'}}>
          <Icon size={16} style={{color:accent?'var(--green)':'var(--text-3)'}}/>
        </div>}
      </div>
    </Card>
  )
}

/* ══════ MODAL ══════ */
export function Modal({ open, onClose, title, children, width='480px', sub }: {
  open:boolean; onClose:()=>void; title:string; children:React.ReactNode; width?:string; sub?:string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 ai2"
      style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="flex flex-col ai" onClick={e=>e.stopPropagation()}
        style={{width,maxWidth:'calc(100vw - 32px)',background:'var(--surface)',border:'1px solid var(--border-2)',borderRadius:14,maxHeight:'90vh',overflow:'auto',boxShadow:'0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'}}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
          <div>
            <h2 className="font-semibold text-[15px]" style={{color:'var(--text)'}}>{title}</h2>
            {sub&&<p className="text-[11.5px] mt-0.5" style={{color:'var(--text-3)'}}>{sub}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[17px] leading-none transition-colors"
            style={{color:'var(--text-3)',background:'var(--surface-2)',border:'1px solid var(--border)'}}>×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ══════ CONFIRM MODAL ══════
   Guardrail for destructive actions (delete/remove) — never fire a mutation
   straight from a click handler. Every delete/remove flow in the app should
   route through this so a misclick can't destroy data with zero recourse. */
export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel='Delete', danger=true, loading }: {
  open:boolean; onClose:()=>void; onConfirm:()=>void; title:string; description:React.ReactNode
  confirmLabel?:string; danger?:boolean; loading?:boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed" style={{color:'var(--text-2)'}}>{description}</p>
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={onClose} className="flex-1 justify-center">Cancel</Button>
          <Button variant={danger?'danger':'primary'} loading={loading} onClick={onConfirm} className="flex-1 justify-center">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ══════ TABS ══════ */
export function Tabs({ tabs, active, onChange }: { tabs:{key:string;label:string;icon?:any}[]; active:string; onChange:(k:string)=>void }) {
  return (
    <div className="flex gap-1 p-1 rounded-[10px] flex-wrap max-w-full overflow-x-auto" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>
      {tabs.map(t=>(
        <button key={t.key} onClick={()=>onChange(t.key)}
          className="flex items-center gap-1.5 px-3.5 h-7 rounded-[7px] text-[12px] font-semibold transition-all whitespace-nowrap flex-shrink-0"
          style={{
            background: active===t.key?'var(--surface)':'transparent',
            color:      active===t.key?'var(--green)':'var(--text-3)',
            border:     active===t.key?'1px solid var(--border-2)':'1px solid transparent',
            boxShadow:  active===t.key?'0 1px 4px rgba(0,0,0,0.25)':'none',
          }}
          onMouseEnter={e=>{ if(active!==t.key) e.currentTarget.style.color='var(--text)' }}
          onMouseLeave={e=>{ if(active!==t.key) e.currentTarget.style.color='var(--text-3)' }}>
          {t.icon&&<t.icon size={12}/>}{t.label}
        </button>
      ))}
    </div>
  )
}

/* ══════ SCROLL FADE (Y) ══════
   Wraps a vertically-scrollable panel (e.g. a detail-page sidebar stacking several
   cards) and fades its top/bottom edges in when there's more content to scroll to.
   Without this, overflow-y:auto content that runs past a short viewport just looks
   cut off / broken — there's no cue it's scrollable at all. `bg` should match the
   color immediately behind the scrolling content (page bg by default). */
export function ScrollFadeY({ children, className='', bg='var(--bg)' }: { children:React.ReactNode; className?:string; bg?:string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ atTop:true, atBottom:true })
  function update() {
    const el = ref.current
    if (!el) return
    const next = { atTop: el.scrollTop <= 4, atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 4 }
    // Only commit a state change when something actually moved — an unconditional
    // setState on every render (e.g. inside a dependency-less useEffect) causes an
    // infinite render loop, since this component re-renders on every state change.
    setState(prev => (prev.atTop === next.atTop && prev.atBottom === next.atBottom) ? prev : next)
  }
  // Re-check once after mount/content changes (new data can change scrollHeight
  // without the user ever scrolling) via ResizeObserver instead of an effect that
  // reruns every render.
  useEffect(() => {
    update()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])
  return (
    <div className="relative flex-1 min-h-0">
      {!state.atTop && <div className="pointer-events-none absolute top-0 left-0 right-0 h-5 z-10" style={{background:`linear-gradient(180deg, ${bg} 0%, transparent 100%)`}}/>}
      <div ref={ref} onScroll={update} className={`overflow-y-auto h-full ${className}`}>{children}</div>
      {!state.atBottom && <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 z-10" style={{background:`linear-gradient(0deg, ${bg} 0%, transparent 100%)`}}/>}
    </div>
  )
}

/* ══════ PROGRESS BAR ══════ */
export function ProgressBar({ pct, color='var(--green)', height=5 }: { pct:number; color?:string; height?:number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{height,background:'var(--surface-3)'}}>
      <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min(100,Math.max(0,pct))}%`,background:color}}/>
    </div>
  )
}

/* ══════ EMPTY STATE ══════ */
export function EmptyState({ icon, title, description, action }: { icon:React.ReactNode; title:string; description:string; action?:React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-[38px] opacity-20">{icon}</div>
      <div>
        <div className="font-semibold text-[14px]" style={{color:'var(--text)'}}>{title}</div>
        <div className="text-[12.5px] mt-1 max-w-xs" style={{color:'var(--text-3)'}}>{description}</div>
      </div>
      {action}
    </div>
  )
}

/* ══════ SPINNER ══════ */
export function Spinner({ size=22 }: { size?:number }) {
  return (
    <div className="flex items-center justify-center w-full py-12">
      <div style={{width:size,height:size,border:'2.5px solid var(--border-2)',borderTopColor:'var(--green)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
    </div>
  )
}

/* ══════ ALERT ══════ */
export function Alert({ type='info', children }: { type?:'info'|'warn'|'error'|'success'; children:React.ReactNode }) {
  const map = { info:['#3B82F6','rgba(59,130,246,0.08)'], warn:['#F59E0B','rgba(245,158,11,0.08)'], error:['#E4483F','rgba(228,72,63,0.08)'], success:['#10B981','rgba(16,185,129,0.08)'] }
  const [c,bg]=map[type]
  return <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[9px] text-[12.5px]" style={{color:c,background:bg,border:`1px solid ${c}30`}}>{children}</div>
}

/* ══════ DIVIDER ══════ */
export function Divider({ label }: { label?:string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px" style={{background:'var(--border)'}}/>
      {label&&<span className="text-[11.5px]" style={{color:'var(--text-3)'}}>{label}</span>}
      {label&&<div className="flex-1 h-px" style={{background:'var(--border)'}}/>}
    </div>
  )
}

export { ErrorBoundary } from './ErrorBoundary'
