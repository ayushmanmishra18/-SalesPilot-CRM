import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi } from '../../api'
import { Spinner, SlaPill } from '../ui'
import { formatRelativeTime } from '../../utils/sla'
import { FileText, CheckSquare, MessageCircle, Mail, Check, ArrowRightCircle } from 'lucide-react'
import { useState } from 'react'

const ICON:any  = {note:FileText,task:CheckSquare,comment:MessageCircle,email:Mail}
const COLOR:any = {note:'#7B7A95',task:'#3B82F6',comment:'#10B981',email:'#F59E0B'}

// Replaces raw "@[publicId]" mention tokens with the "@Name" the user actually typed —
// tenantUsers maps publicId -> display name so mentions never show a raw UUID to the reader.
function renderMentions(text: string, tenantUsers: { id: string; name: string }[]) {
  if (!text.includes('@[')) return text
  const parts = text.split(/(@\[[^\]]+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]$/)
    if (!match) return part
    const user = tenantUsers.find(u => u.id === match[1])
    return (
      <span key={i} className="font-semibold" style={{ color: 'var(--green)' }}>
        @{user?.name ?? 'Unknown user'}
      </span>
    )
  })
}

export function ActivityFeed({ relatedTo, canWrite, tenantUsers=[] }:{relatedTo:{type:'contact'|'deal';id:string};canWrite:boolean;tenantUsers?:{id:string;name:string}[]} ) {
  const qc  = useQueryClient()
  const key = `${relatedTo.type}:${relatedTo.id}`
  const [converting,setConverting] = useState<string|null>(null)

  const {data,isLoading} = useQuery({ queryKey:['activities',relatedTo.id], queryFn:()=>activitiesApi.list(key).then(r=>r.data), refetchInterval:30_000 })
  const completeMut = useMutation({ mutationFn:(id:string)=>activitiesApi.complete(id), onSuccess:()=>qc.invalidateQueries({queryKey:['activities',relatedTo.id]}) })
  const convertMut  = useMutation({ mutationFn:({id,text,dueDate}:{id:string;text:string;dueDate:string})=>activitiesApi.convertToTask(id,{text,dueDate}), onSuccess:()=>{qc.invalidateQueries({queryKey:['activities',relatedTo.id]});setConverting(null)} })

  if (isLoading) return <Spinner size={18}/>
  const activities = data?.activities??[]
  if (activities.length===0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-[32px] mb-3 opacity-20">💬</div>
      <div className="text-[13px] font-medium" style={{color:'var(--text-2)'}}>No activity yet</div>
      <div className="text-[12px] mt-1" style={{color:'var(--text-3)'}}>Add the first note, task, or comment above</div>
    </div>
  )

  return (
    <div className="flex flex-col">
      {activities.map((a:any,i:number)=>{
        const Icon=ICON[a.type]??FileText; const color=COLOR[a.type]??'#7B7A95'
        return (
          <div key={a.id} className="flex gap-3 py-3.5" style={{borderTop:i?'1px solid var(--border)':'none'}}>
            {/* icon */}
            <div className="w-7 h-7 rounded-[8px] flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:`${color}14`,border:`1px solid ${color}28`}}>
              <Icon size={13} style={{color}}/>
            </div>
            {/* content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-3)'}}>{a.type}</span>
                <span className="text-[10.5px] flex-shrink-0" style={{color:'var(--text-3)'}}>{formatRelativeTime(a.createdAt)}</span>
              </div>

              {a.type==='task'?(
                <div className="flex items-start gap-2.5">
                  {canWrite&&(
                    <button onClick={()=>!a.done&&completeMut.mutate(a.id)} disabled={a.done} className="mt-0.5 flex-shrink-0">
                      <div className={`w-[15px] h-[15px] rounded-[4px] border flex items-center justify-center transition-all ${a.done?'border-[var(--green)] bg-[var(--green)]':'border-[var(--border-2)] hover:border-[var(--green)]'}`}>
                        {a.done&&<Check size={9} className="text-white"/>}
                      </div>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${a.done?'line-through opacity-40':''}`} style={{color:'var(--text)'}}>{a.text}</p>
                    {a.dueDate&&!a.done&&<div className="mt-1.5"><SlaPill status={new Date(a.dueDate)<new Date()?'overdue':new Date(a.dueDate).toDateString()===new Date().toDateString()?'due_today':'upcoming'}/></div>}
                    {a.done&&a.completedAt&&<div className="text-[10.5px] mt-0.5" style={{color:'var(--text-3)'}}>Completed {formatRelativeTime(a.completedAt)}</div>}
                  </div>
                </div>
              ):(
                <>
                  {a.type==='email'&&a.emailSubject&&<div className="text-[11.5px] mb-1" style={{color:'var(--text-3)'}}>To: {a.emailTo} · {a.emailSubject}</div>}
                  <p className="text-[13px] leading-relaxed" style={{color:'var(--text)'}}>{renderMentions(a.text, tenantUsers)}</p>
                  {canWrite&&(a.type==='comment'||a.type==='note')&&!a.convertedTo&&(
                    <div className="mt-2">
                      {converting===a.id?(
                        <div className="flex items-center gap-2 mt-1">
                          <input autoFocus className="flex-1 rounded-[7px] px-2.5 text-[12px] outline-none h-7 transition-all"
                            style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                            placeholder="Task title..."
                            onFocus={e=>e.currentTarget.style.borderColor='var(--green)'} onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}
                            onKeyDown={e=>{
                              if(e.key==='Enter') convertMut.mutate({id:a.id,text:(e.target as HTMLInputElement).value||a.text,dueDate:new Date(Date.now()+86400000).toISOString()})
                              if(e.key==='Escape') setConverting(null)
                            }}/>
                          <span className="text-[10.5px]" style={{color:'var(--text-3)'}}>↵ convert</span>
                        </div>
                      ):(
                        <button onClick={()=>setConverting(a.id)} className="flex items-center gap-1 text-[11px] font-medium mt-1 transition-opacity hover:opacity-70" style={{color:'var(--green)'}}>
                          <ArrowRightCircle size={11}/>Convert to task
                        </button>
                      )}
                    </div>
                  )}
                  {a.convertedTo&&<div className="text-[10.5px] mt-1" style={{color:'var(--text-3)'}}>→ converted to task</div>}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
