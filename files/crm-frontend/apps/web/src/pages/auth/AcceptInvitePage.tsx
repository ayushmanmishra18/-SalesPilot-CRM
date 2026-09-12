import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../api'
import { Button, Alert } from '../../components/ui'

export default function AcceptInvitePage() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const setTokens = useAuthStore(s=>s.setTokens)
  const token = sp.get('token')??''
  const [pw, setPw] = useState(''); const [c, setC] = useState(''); const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(true)
  useEffect(()=>{ if(!token) setOk(false) },[token])

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setErr('')
    if(pw.length<8){setErr('Minimum 8 characters');return}
    if(pw!==c){setErr('Passwords do not match');return}
    setLoading(true)
    try { const {data}=await authApi.acceptInvite(token,pw); setTokens(data.accessToken,data.refreshToken); nav('/dashboard') }
    catch(e:any) {
      const code=e.response?.data?.error?.code
      setErr(code==='INVITE_EXPIRED'?'Invite link expired. Ask your admin to resend.':code==='INVITE_ALREADY_USED'?'This invite was already used. Go to login.':e.response?.data?.error?.message??'Something went wrong')
    } finally { setLoading(false) }
  }

  if(!ok) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🔗</div>
        <h2 className="text-[17px] font-bold mb-2" style={{color:'var(--text)'}}>Invalid invite link</h2>
        <p className="text-[13px] mb-6" style={{color:'var(--text-3)'}}>Ask your admin to resend the invitation.</p>
        <Button onClick={()=>nav('/login')} variant="ghost">Go to login</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[11px] g gl"/>
          <span className="font-bold text-[15px]" style={{color:'var(--text)'}}>SalesPilot CRM</span>
        </div>
        <div className="rounded-[14px] overflow-hidden" style={{background:'var(--surface)',border:'1px solid rgba(16,185,129,0.35)',boxShadow:'0 0 40px rgba(16,185,129,0.08), 0 20px 50px rgba(0,0,0,0.4)'}}>
          <div className="px-6 py-5 flex items-center gap-3" style={{borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.2)'}}>
              <UserPlus size={16} style={{color:'var(--green)'}}/>
            </div>
            <div>
              <div className="font-bold text-[15px]" style={{color:'var(--text)'}}>Accept invitation</div>
              <div className="text-[12px]" style={{color:'var(--text-3)'}}>Set your password to join the workspace</div>
            </div>
          </div>
          <div className="p-6">
            {err&&<div className="mb-5"><Alert type="error">{err}</Alert></div>}
            <form onSubmit={submit} className="flex flex-col gap-4">
              {[{label:'Password',v:pw,set:setPw,ph:'Min 8 chars, 1 uppercase, 1 number'},{label:'Confirm password',v:c,set:setC,ph:'Same as above'}].map((f,i)=>(
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{f.label}</label>
                  <input type="password" value={f.v} onChange={e=>f.set(e.target.value)} required autoFocus={i===0} placeholder={f.ph}
                    className="w-full rounded-[9px] px-3 text-[13px] outline-none h-10 transition-all"
                    style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                    onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                    onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
                </div>
              ))}
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">Join workspace</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
