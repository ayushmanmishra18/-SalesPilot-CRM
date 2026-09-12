import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { authApi, api } from '../../api'
import { Alert, Divider } from '../../components/ui'

declare global { interface Window { google:any; msal:any } }

export default function LoginPage() {
  const nav        = useNavigate()
  const setTokens  = useAuthStore(s=>s.setTokens)
  const setReset   = useAuthStore(s=>s.setMustReset)
  const { theme, toggle } = useThemeStore()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [ssoLoad,   setSsoLoad]   = useState<'google'|'microsoft'|null>(null)

  const GID = import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string|undefined
  const MID = import.meta.env['VITE_MICROSOFT_CLIENT_ID'] as string|undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email||!password) return
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setTokens(data.accessToken, data.refreshToken)
      nav('/dashboard')
    } catch (err:any) {
      const code = err.response?.data?.error?.code
      if (code==='MUST_RESET_PASSWORD') {
        sessionStorage.setItem('reset-email',email)
        sessionStorage.setItem('reset-password',password)
        setReset(true); nav('/reset-password'); return
      }
      setError(err.response?.data?.error?.message ?? 'Invalid email or password')
    } finally { setLoading(false) }
  }

  async function googleLogin() {
    if (!GID) { setError('Google Sign-In not configured'); return }
    setSsoLoad('google'); setError('')
    try {
      await new Promise<void>((res,rej)=>{
        if (window.google?.accounts) return res()
        const s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'
        s.onload=()=>res(); s.onerror=()=>rej(); document.head.appendChild(s)
      })
      await new Promise<void>((resolve,reject)=>{
        window.google.accounts.id.initialize({ client_id:GID, callback: async (r:{credential:string})=>{
          try { const {data}=await api.post('/auth/login/google',{idToken:r.credential}); setTokens(data.accessToken,data.refreshToken); nav('/dashboard'); resolve() }
          catch(e:any){reject(e)}
        }, auto_select:false })
        window.google.accounts.id.prompt((n:any)=>{ if(n.isNotDisplayed()||n.isSkippedMoment()) window.google.accounts.id.renderButton(document.getElementById('g-btn')!,{theme:'outline',size:'large',width:380}) })
      })
    } catch(e:any) { setError(e.response?.data?.error?.message??'Google sign-in failed') }
    finally { setSsoLoad(null) }
  }

  async function msLogin() {
    if (!MID) { setError('Microsoft Sign-In not configured'); return }
    setSsoLoad('microsoft'); setError('')
    try {
      await new Promise<void>((res,rej)=>{ if(window.msal) return res(); const s=document.createElement('script'); s.src='https://alcdn.msauth.net/browser/2.38.1/js/msal-browser.min.js'; s.onload=()=>res(); s.onerror=()=>rej(); document.head.appendChild(s) })
      const msal=new window.msal.PublicClientApplication({auth:{clientId:MID,redirectUri:window.location.origin}})
      await msal.initialize()
      const r=await msal.loginPopup({scopes:['User.Read']})
      const {data}=await api.post('/auth/login/microsoft',{accessToken:r.accessToken})
      setTokens(data.accessToken,data.refreshToken); nav('/dashboard')
    } catch(e:any) { if(e?.errorCode!=='user_cancelled') setError(e.response?.data?.error?.message??'Microsoft sign-in failed') }
    finally { setSsoLoad(null) }
  }

  return (
    <div className="min-h-screen flex" style={{background:'var(--bg)'}}>
      {/* ─── Brand panel ─── */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{background:'var(--surface)',borderRight:'1px solid var(--border)'}}>
        {/* ambient glow */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 65%)'}}/>
        <div className="absolute top-20 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{background:'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)'}}/>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[11px] g gl"/>
          <div>
            <div className="font-bold text-[15px]" style={{color:'var(--text)'}}>SalesPilot CRM</div>
            <div className="text-[10.5px]" style={{color:'var(--text-3)'}}>Sales intelligence platform</div>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <h1 className="text-[34px] font-bold leading-[1.15] mb-4" style={{color:'var(--text)'}}>
            Close more.<br/>Chase less.
          </h1>
          <p className="text-[13.5px] leading-relaxed mb-8" style={{color:'var(--text-2)',maxWidth:300}}>
            Every deal, follow-up, and teammate — one place that keeps your entire pipeline moving forward.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-2.5">
            {[
              ['Multi-tenant & isolated', 'Your data, completely separate'],
              ['Live SLA engine', 'Never miss a follow-up again'],
              ['Real-time collaboration', 'Socket.IO powered updates'],
            ].map(([title, desc])=>(
              <div key={title} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px]"
                style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:'var(--green)'}}/>
                <div>
                  <div className="text-[12px] font-semibold" style={{color:'var(--text)'}}>{title}</div>
                  <div className="text-[10.5px]" style={{color:'var(--text-3)'}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{color:'var(--text-3)'}}>
          © {new Date().getFullYear()} SalesPilot · Built for growing sales teams
        </p>
      </div>

      {/* ─── Form panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Theme toggle */}
        <button onClick={toggle}
          className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors"
          style={{background:'var(--surface)',border:'1px solid var(--border)',color:'var(--text-3)'}}>
          {theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}
        </button>

        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-[10px] g gl"/>
            <span className="font-bold text-[15px]" style={{color:'var(--text)'}}>SalesPilot CRM</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[24px] font-bold mb-1" style={{color:'var(--text)'}}>Welcome back</h2>
            <p className="text-[13.5px]" style={{color:'var(--text-3)'}}>Sign in to your workspace</p>
          </div>

          {error&&<div className="mb-5"><Alert type="error">{error}</Alert></div>}

          {/* SSO */}
          <div className="flex flex-col gap-2.5 mb-6">
            {[
              { key:'google', label:'Continue with Google', disabled:ssoLoad!==null, onClick:googleLogin,
                icon:<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
              { key:'microsoft', label:'Continue with Microsoft', disabled:ssoLoad!==null, onClick:msLogin,
                icon:<svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg> },
            ].map(btn=>(
              <button key={btn.key} onClick={btn.onClick} disabled={btn.disabled}
                className="flex items-center justify-center gap-3 w-full h-[42px] rounded-[10px] text-[13px] font-medium transition-all disabled:opacity-60"
                style={{background:'var(--surface)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}>
                {ssoLoad===btn.key
                  ? <span style={{width:14,height:14,border:'2px solid var(--green)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .65s linear infinite'}}/>
                  : btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          <Divider label="or sign in with email"/>

          {/* Form */}
          <form onSubmit={submit} className="flex flex-col gap-4 mt-6">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>Email address</label>
              <input type="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
                className="w-full rounded-[9px] px-3 text-[13px] outline-none h-[42px] transition-all"
                style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>Password</label>
              <div className="relative">
                <input type={showPw?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required
                  className="w-full rounded-[9px] pl-3 pr-11 text-[13px] outline-none h-[42px] transition-all"
                  style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                  onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                  onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{color:'var(--text-3)'}}>
                  {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading||!email||!password}
              className="w-full h-[42px] rounded-[10px] text-[13.5px] font-bold text-white flex items-center justify-center gap-2 mt-1 transition-all disabled:opacity-40 g gl"
              style={{cursor:loading?'wait':'pointer'}}>
              {loading
                ? <span style={{width:15,height:15,border:'2.5px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin .65s linear infinite'}}/>
                : <><span>Sign in</span><ArrowRight size={14}/></>}
            </button>
          </form>

          <div id="g-btn" className="mt-3"/>

          <p className="text-center text-[12px] mt-7" style={{color:'var(--text-3)'}}>
            Don't have an account? Ask your admin for an invite.
          </p>
        </div>
      </div>
    </div>
  )
}
