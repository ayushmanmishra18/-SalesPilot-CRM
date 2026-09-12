import { useState } from 'react'
import { Send, FileText, CheckSquare, MessageCircle, Mail } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi, newIdempotencyKey } from '../../api'
import { Button } from '../ui'

type Tab = 'note'|'task'|'comment'|'email'
const TABS: {key:Tab;label:string;icon:any;ph:string}[] = [
  {key:'note',    label:'Note',    icon:FileText,      ph:'Write a note...'},
  {key:'task',    label:'Task',    icon:CheckSquare,   ph:'Task description...'},
  {key:'comment', label:'Comment', icon:MessageCircle, ph:'Write a comment or @mention someone...'},
  {key:'email',   label:'Email',   icon:Mail,          ph:'Write your email body...'},
]

export function ActivityComposer({ relatedTo, tenantUsers=[], onCreated }: {
  relatedTo:{type:'contact'|'deal';id:string}; tenantUsers?:{id:string;name:string}[]; onCreated?:()=>void
}) {
  const qc = useQueryClient()
  const [tab,     setTab]     = useState<Tab>('note')
  const [text,    setText]    = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignee,setAssignee]= useState('')
  const [subject, setSubject] = useState('')
  const [emailTo, setEmailTo] = useState('')

  const mut = useMutation({
    mutationFn:(d:any)=>activitiesApi.create(d,newIdempotencyKey()),
    onSuccess:()=>{ qc.invalidateQueries({queryKey:['activities',relatedTo.id]}); setText(''); setDueDate(''); setAssignee(''); setSubject(''); setEmailTo(''); onCreated?.() }
  })

  function send() {
    if (!text.trim()) return
    const extras:any={}
    if(tab==='task'){extras.dueDate=dueDate||new Date(Date.now()+86400000).toISOString();extras.assigneeId=assignee||undefined}
    if(tab==='comment'){extras.mentions=[...text.matchAll(/@\[([^\]]+)\]/g)].map(m=>m[1])}
    if(tab==='email'){extras.emailSubject=subject;extras.emailTo=emailTo}
    mut.mutate({type:tab,text:text.trim(),relatedTo,...extras})
  }

  const cur = TABS.find(t=>t.key===tab)!

  return (
    <div className="rounded-[11px] overflow-hidden" style={{background:'var(--surface-2)',border:'1px solid var(--border-2)'}}>
      {/* Type tabs */}
      <div className="flex" style={{borderBottom:'1px solid var(--border)'}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium transition-colors flex-1 justify-center"
            style={{color:tab===t.key?'var(--green)':'var(--text-3)',borderBottom:tab===t.key?'2px solid var(--green)':'2px solid transparent',background:'transparent'}}>
            <t.icon size={12}/>{t.label}
          </button>
        ))}
      </div>

      {/* Email fields */}
      {tab==='email'&&(
        <div className="grid grid-cols-2 gap-2 px-3.5 pt-3">
          <input placeholder="To: email@company.com" type="email" value={emailTo} onChange={e=>setEmailTo(e.target.value)}
            className="rounded-[8px] px-3 text-[12.5px] outline-none h-8 transition-all"
            style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
            onFocus={e=>e.currentTarget.style.borderColor='var(--green)'} onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
          <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)}
            className="rounded-[8px] px-3 text-[12.5px] outline-none h-8 transition-all"
            style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
            onFocus={e=>e.currentTarget.style.borderColor='var(--green)'} onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
        </div>
      )}

      {/* Task fields */}
      {tab==='task'&&(
        <div className="flex gap-2 px-3.5 pt-3">
          <input type="datetime-local" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{flex:1,height:32,fontSize:12}}/>
          {tenantUsers.length>0&&(
            <select value={assignee} onChange={e=>setAssignee(e.target.value)} style={{flex:1,height:32,fontSize:12}}>
              <option value="">Assign to...</option>
              {tenantUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Text */}
      <div className="px-3.5 pt-3 pb-2">
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder={cur.ph} rows={3}
          onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))send()}}
          className="w-full bg-transparent text-[13px] outline-none resize-none leading-relaxed"
          style={{color:'var(--text)'}}/>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5" style={{borderTop:'1px solid var(--border)'}}>
        <span className="text-[10.5px] flex-shrink-0" style={{color:'var(--text-3)'}}>⌘↵ to send</span>
        <Button size="sm" onClick={send} loading={mut.isPending} disabled={!text.trim()} className="flex-shrink-0">
          <Send size={11}/>{tab==='email'?'Send email':tab==='task'?'Create task':'Post'}
        </Button>
      </div>
    </div>
  )
}
