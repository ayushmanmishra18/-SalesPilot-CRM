import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../../api'
import { formatRelativeTime } from '../../utils/sla'

export function NotificationsBell() {
  const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement>(null)
  const nav=useNavigate(); const qc=useQueryClient()
  const {data}=useQuery({queryKey:['notifications'],queryFn:()=>notificationsApi.list().then(r=>r.data),refetchInterval:30_000})
  const readMut=useMutation({mutationFn:(id:string)=>notificationsApi.read(id),onSuccess:()=>qc.invalidateQueries({queryKey:['notifications']})})
  const readAllMut=useMutation({mutationFn:()=>notificationsApi.readAll(),onSuccess:()=>qc.invalidateQueries({queryKey:['notifications']})})

  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)}
    document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h)
  },[])

  const notifs=data?.notifications??[]; const unread=data?.unreadCount??0
  function click(n:any){if(!n.read)readMut.mutate(n.id);if(n.relatedTo?.type==='deal')nav(`/deals/${n.relatedTo.id}`);if(n.relatedTo?.type==='contact')nav(`/contacts/${n.relatedTo.id}`);setOpen(false)}

  return (
    <div ref={ref} className="relative">
      <button onClick={()=>setOpen(o=>!o)} aria-label={unread>0?`Notifications, ${unread} unread`:'Notifications'} className="relative w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors"
        style={{color:'var(--text-3)',background:open?'var(--surface-2)':'transparent',border:`1px solid ${open?'var(--border)':'transparent'}`}}>
        <Bell size={15}/>
        {unread>0&&<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
          style={{background:'#E4483F',boxShadow:'0 0 8px rgba(228,72,63,0.6)'}}>
          {unread>9?'9+':unread}
        </span>}
      </button>

      {open&&(
        <div className="absolute right-0 top-11 w-[340px] rounded-[12px] z-50 overflow-hidden ai"
          style={{background:'var(--surface)',border:'1px solid var(--border-2)',boxShadow:'0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)'}}>
          <div className="flex items-center justify-between px-4 py-3.5" style={{borderBottom:'1px solid var(--border)'}}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[13px]" style={{color:'var(--text)'}}>Notifications</span>
              {unread>0&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(228,72,63,0.15)',color:'#E4483F'}}>{unread}</span>}
            </div>
            {unread>0&&<button onClick={()=>readAllMut.mutate()} className="text-[11px] font-medium" style={{color:'var(--green)'}}>Mark all read</button>}
          </div>

          <div style={{maxHeight:360,overflowY:'auto'}}>
            {notifs.length===0?(
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell size={24} className="mb-3 opacity-20"/>
                <div className="text-[12.5px]" style={{color:'var(--text-3)'}}>All caught up!</div>
              </div>
            ):notifs.slice(0,20).map((n:any,i:number)=>(
              <div key={n.id} onClick={()=>click(n)} className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                style={{borderTop:i?'1px solid var(--border)':'none',background:n.read?'transparent':'rgba(16,185,129,0.04)'}}>
                {!n.read&&<div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{background:'var(--green)'}}/>}
                <div className={`flex-1 min-w-0 ${n.read?'ml-[18px]':''}`}>
                  <p className="text-[12.5px] leading-snug" style={{color:'var(--text)'}}>{n.message}</p>
                  <p className="text-[10.5px] mt-0.5" style={{color:'var(--text-3)'}}>{formatRelativeTime(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
