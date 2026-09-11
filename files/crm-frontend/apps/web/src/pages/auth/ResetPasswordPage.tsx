import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../api'
import { Button, Alert } from '../../components/ui'

export default function ResetPasswordPage() {
  const nav = useNavigate(); const setReset = useAuthStore(s=>s.setMustReset)
  const [pw, setPw] = useState(''); const [c, setC] = useState('')
  const [err, setErr] = useState(''); const [loading, setLoading] = useState(false)
  const checks = [{ ok:pw.length>=8,label:'8+ characters' },{ ok:/[A-Z]/.test(pw),label:'Uppercase' },{ ok:/[0-9]/.test(pw),label:'Number' },{ ok:pw===c&&!!c,label:'Passwords match' }]
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!checks.every(x=>x.ok)) { setErr('Please meet all requirements'); return }
    setLoading(true)
    try { await authApi.resetPassword(pw,c); setReset(false); nav('/dashboard') }
    catch(e:any) { setErr(e.response?.data?.error?.message??'Something went wrong') }
    finally { setLoading(false) }
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[11px] g gl"/>
          <span className="font-bold text-[15px]" style={{color:'var(--text)'}}>SalesPilot CRM</span>
        </div>
        <div className="rounded-[14px] overflow-hidden" style={{background:'var(--surface)',border:'1px solid var(--border)',boxShadow:'0 20px 50px rgba(0,0,0,0.4)'}}>
          <div className="px-6 py-5 flex items-center gap-3" style={{borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.2)'}}>
              <KeyRound size={16} style={{color:'var(--green)'}}/>
            </div>
            <div>
              <div className="font-bold text-[15px]" style={{color:'var(--text)'}}>Set your password</div>
              <div className="text-[12px]" style={{color:'var(--text-3)'}}>Replace the temporary password to continue</div>
            </div>
          </div>
          <div className="p-6">
            {err&&<div className="mb-5"><Alert type="error">{err}</Alert></div>}
            <form onSubmit={submit} className="flex flex-col gap-4">
              {[{label:'New password',v:pw,set:setPw},{label:'Confirm password',v:c,set:setC}].map((f,i)=>(
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{f.label}</label>
                  <input type="password" value={f.v} onChange={e=>f.set(e.target.value)} required autoFocus={i===0}
                    placeholder={i===0?'Min 8 chars, 1 uppercase, 1 number':'Same as above'}
                    className="w-full rounded-[9px] px-3 text-[13px] outline-none h-10 transition-all"
                    style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                    onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                    onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
                </div>
              ))}
              {/* Strength indicators */}
              <div className="grid grid-cols-2 gap-2">
                {checks.map(ch=>(
                  <div key={ch.label} className="flex items-center gap-2 text-[11.5px]">
                    <CheckCircle size={13} style={{color:ch.ok?'var(--green)':'var(--border-2)',flexShrink:0}}/>
                    <span style={{color:ch.ok?'var(--text)':'var(--text-3)'}}>{ch.label}</span>
                  </div>
                ))}
              </div>
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">Set password & continue</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
