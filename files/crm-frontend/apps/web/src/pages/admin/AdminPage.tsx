import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, PauseCircle, PlayCircle, Copy, Check, Building2, Users, GitBranch } from 'lucide-react'
import { adminApi } from '../../api'
import { Button, Input, Modal, Spinner, Alert, Badge } from '../../components/ui'
import { formatRelativeTime } from '../../utils/sla'

function LoginGate({ onLogin }: { onLogin:()=>void }) {
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try { const {data}=await adminApi.login(email,pw); localStorage.setItem('adminToken',data.token); onLogin() }
    catch(e:any){setErr(e.response?.data?.error?.message??'Invalid credentials')}
    finally{setLoading(false)}
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[11px] g gl flex items-center justify-center"><Shield size={15} className="text-white"/></div>
          <div><div className="font-bold text-[15px]" style={{color:'var(--text)'}}>Super Admin</div><div className="text-[11px]" style={{color:'var(--text-3)'}}>Platform management console</div></div>
        </div>
        <div className="rounded-[14px] overflow-hidden" style={{background:'var(--surface)',border:'1px solid var(--border)',boxShadow:'0 20px 50px rgba(0,0,0,0.4)'}}>
          <div className="px-6 py-4" style={{borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
            <div className="font-semibold text-[14px]" style={{color:'var(--text)'}}>Sign in</div>
            <div className="text-[11.5px] mt-0.5" style={{color:'var(--text-3)'}}>Restricted to platform administrators only</div>
          </div>
          <div className="p-6">
            {err&&<div className="mb-4"><Alert type="error">{err}</Alert></div>}
            <form onSubmit={submit} className="flex flex-col gap-4">
              {[{label:'Email',type:'email',v:email,set:setEmail},{label:'Password',type:'password',v:pw,set:setPw}].map((f,i)=>(
                <div key={i} className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold tracking-wide" style={{color:'var(--text-3)'}}>{f.label}</label>
                  <input type={f.type} value={f.v} onChange={e=>f.set(e.target.value)} required autoFocus={i===0}
                    className="w-full rounded-[9px] px-3 text-[13px] outline-none h-10 transition-all"
                    style={{background:'var(--input)',border:'1.5px solid var(--border-2)',color:'var(--text)'}}
                    onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                    onBlur={e=>e.currentTarget.style.borderColor='var(--border-2)'}/>
                </div>
              ))}
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">Sign in to console</Button>
            </form>
            <p className="text-center text-[11.5px] mt-5" style={{color:'var(--text-3)'}}>
              Not an admin? <a href="/login" style={{color:'var(--green)'}}>Go to CRM login →</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const qc = useQueryClient()
  const [authed, setAuthed] = useState(!!localStorage.getItem('adminToken'))
  const [adding, setAdding] = useState(false)
  const [form,   setForm]   = useState({name:'',adminName:'',adminEmail:''})
  const [creds,  setCreds]  = useState<{email:string;password:string}|null>(null)
  const [copied, setCopied] = useState<string|null>(null)

  const {data,isLoading} = useQuery({ queryKey:['admin-tenants'], queryFn:()=>adminApi.listTenants().then(r=>r.data), enabled:authed })
  const addMut = useMutation({ mutationFn:()=>adminApi.addTenant(form), onSuccess:res=>{ qc.invalidateQueries({queryKey:['admin-tenants']}); setCreds(res.data.credentials); setAdding(false); setForm({name:'',adminName:'',adminEmail:''}) } })
  const suspendMut    = useMutation({ mutationFn:(id:string)=>adminApi.suspend(id),    onSuccess:()=>qc.invalidateQueries({queryKey:['admin-tenants']}) })
  const reactivateMut = useMutation({ mutationFn:(id:string)=>adminApi.reactivate(id), onSuccess:()=>qc.invalidateQueries({queryKey:['admin-tenants']}) })

  function copy(val:string,k:string) { navigator.clipboard.writeText(val); setCopied(k); setTimeout(()=>setCopied(null),2000) }

  if (!authed) return <LoginGate onLogin={()=>setAuthed(true)}/>

  const tenants = data?.tenants??[]
  const stats = [
    { label:'Total tenants',   value:tenants.length,                                             icon:Building2 },
    { label:'Active',          value:tenants.filter((t:any)=>t.status==='active').length,         icon:GitBranch },
    { label:'Total users',     value:tenants.reduce((s:number,t:any)=>s+(t.userCount??0),0),      icon:Users },
  ]

  return (
    <div className="min-h-screen" style={{background:'var(--bg)'}}>
      {/* Topbar */}
      <header className="flex items-center justify-between px-6 h-[54px]" style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[9px] g gl flex items-center justify-center"><Shield size={14} className="text-white"/></div>
          <div><div className="font-bold text-[14px]" style={{color:'var(--text)'}}>Super Admin Console</div></div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={()=>setAdding(true)}><Plus size={13}/>Add tenant</Button>
          <Button size="sm" variant="ghost" onClick={()=>{localStorage.removeItem('adminToken');setAuthed(false)}}>Sign out</Button>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s=>(
            <div key={s.label} className="rounded-[12px] p-5" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-widest mb-2" style={{color:'var(--text-3)'}}>{s.label}</div>
                  <div className="text-[26px] font-bold" style={{color:'var(--text)'}}>{s.value}</div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'var(--surface-2)',border:'1px solid var(--border)'}}>
                  <s.icon size={18} style={{color:'var(--text-3)'}}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {isLoading ? <Spinner/> : (
          <div className="rounded-[12px] overflow-hidden" style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{borderBottom:'1px solid var(--border)',background:'var(--surface-2)'}}>
              <div className="font-semibold text-[13px]" style={{color:'var(--text)'}}>Tenants ({tenants.length})</div>
            </div>
            {tenants.length===0 ? (
              <div className="py-16 text-center text-[13px]" style={{color:'var(--text-3)'}}>No tenants yet — add your first one</div>
            ) : (
              <table>
                <thead><tr>
                  {['Tenant','Admin email','Users','Deals','Status','Created',''].map(h=><th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {tenants.map((t:any)=>(
                    <tr key={t.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg g flex-shrink-0 flex items-center justify-center"><Building2 size={12} className="text-white"/></div>
                          <span className="text-[13px] font-semibold" style={{color:'var(--text)'}}>{t.name}</span>
                        </div>
                      </td>
                      <td className="text-[12.5px]" style={{color:'var(--text-2)'}}>{t.adminEmail??'—'}</td>
                      <td className="font-medium text-[13px]" style={{color:'var(--text)'}}>{t.userCount??0}</td>
                      <td className="font-medium text-[13px]" style={{color:'var(--text)'}}>{t.dealCount??0}</td>
                      <td><Badge color={t.status==='active'?'#10B981':'#E4483F'}>{t.status}</Badge></td>
                      <td className="text-[11.5px]" style={{color:'var(--text-3)'}}>{formatRelativeTime(t.createdAt)}</td>
                      <td>
                        {t.status==='active'
                          ?<button onClick={()=>suspendMut.mutate(t.id)} title="Suspend" style={{color:'var(--text-3)'}} className="hover:text-[#E4483F] transition-colors"><PauseCircle size={15}/></button>
                          :<button onClick={()=>reactivateMut.mutate(t.id)} title="Reactivate" style={{color:'var(--green)'}}><PlayCircle size={15}/></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add tenant modal */}
      <Modal open={adding} onClose={()=>setAdding(false)} title="Add new tenant" sub="Credentials are shown once after creation — copy them securely">
        <div className="flex flex-col gap-4">
          <Alert type="warn">Copy credentials before closing this modal — they won't be shown again.</Alert>
          <Input label="Company name *" placeholder="Acme Corp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Admin name *" placeholder="Jane Smith" value={form.adminName} onChange={e=>setForm(f=>({...f,adminName:e.target.value}))}/>
            <Input label="Admin email *" type="email" placeholder="jane@acme.com" value={form.adminEmail} onChange={e=>setForm(f=>({...f,adminEmail:e.target.value}))}/>
          </div>
          <div className="flex gap-2.5 pt-1">
            <Button variant="ghost" onClick={()=>setAdding(false)} className="flex-1">Cancel</Button>
            <Button loading={addMut.isPending} disabled={!form.name||!form.adminName||!form.adminEmail} onClick={()=>addMut.mutate()} className="flex-1">Create tenant</Button>
          </div>
        </div>
      </Modal>

      {/* Credentials modal */}
      <Modal open={!!creds} onClose={()=>setCreds(null)} title="Tenant created ✓" sub="Share these credentials securely with the customer">
        <div className="flex flex-col gap-4">
          <Alert type="warn">These credentials are shown <strong>once only</strong>. Copy them now.</Alert>
          {creds&&[['Email',creds.email,'e'],['Temporary password',creds.password,'p']].map(([label,val,k])=>(
            <div key={k}>
              <div className="text-[11.5px] font-semibold mb-1.5" style={{color:'var(--text-3)'}}>{label}</div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 rounded-[9px] px-3 py-2.5 font-mono text-[12.5px] truncate" style={{background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--green)'}}>{val}</div>
                <Button size="sm" variant="soft" onClick={()=>copy(val,k)}>
                  {copied===k?<Check size={13} style={{color:'var(--green)'}}/>:<Copy size={13}/>}
                </Button>
              </div>
            </div>
          ))}
          <Alert type="info">The admin must reset their password on first login.</Alert>
          <Button onClick={()=>setCreds(null)} className="w-full">Done — I've saved the credentials</Button>
        </div>
      </Modal>
    </div>
  )
}
