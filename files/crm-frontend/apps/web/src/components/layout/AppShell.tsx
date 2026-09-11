import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, GitBranch, Settings, LogOut, UserCog, BarChart2, Menu, X, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useThemeStore } from '../../store/theme'
import { useSocket, disconnectSocket } from '../../hooks/useSocket'
import { NotificationsBell } from '../ui/NotificationsBell'
import { authApi } from '../../api'
import { ErrorBoundary } from '../ui/ErrorBoundary'

const NAV = [
  { to:'/dashboard', icon:LayoutDashboard, label:'Dashboard' },
  { to:'/contacts',  icon:Users,           label:'Contacts'  },
  { to:'/pipeline',  icon:GitBranch,       label:'Pipeline'  },
  { to:'/users',     icon:UserCog,         label:'Team'      },
  { to:'/analytics', icon:BarChart2,       label:'Analytics' },
  { to:'/settings',  icon:Settings,        label:'Settings'  },
]

function Sidebar({ close }: { close?: () => void }) {
  const { user, refreshToken, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  async function handleLogout() {
    try { if (refreshToken) await authApi.logout(refreshToken) } catch {}
    disconnectSocket(); logout(); navigate('/login')
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[54px] flex-shrink-0" style={{borderBottom:'1px solid var(--border)'}}>
        <div className="w-[28px] h-[28px] rounded-[8px] g gl flex-shrink-0"/>
        <span className="font-bold text-[14px] tracking-tight" style={{color:'var(--text)'}}>SalesPilot</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-px p-2.5 flex-1 overflow-y-auto">
        {NAV.map(n=>(
          <NavLink key={n.to} to={n.to} onClick={close}
            className={({isActive})=>`flex items-center gap-2.5 px-3 py-[8px] rounded-[8px] text-[12.5px] font-medium transition-all ${isActive?'g gl text-white':''}`}
            style={({isActive})=>isActive?{}:{color:'var(--text-2)'}}>
            {({isActive})=><>
              <n.icon size={14} style={{color:isActive?'white':'var(--text-3)',flexShrink:0}}/>
              {n.label}
            </>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-2.5 flex-shrink-0" style={{borderTop:'1px solid var(--border)'}}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px]" style={{background:'var(--surface-2)'}}>
          <div className="w-7 h-7 rounded-full g flex-shrink-0 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">{user?.role?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold capitalize truncate" style={{color:'var(--text)'}}>{user?.role}</div>
          </div>
          <button onClick={toggle} className="p-1.5 rounded-[6px] transition-colors hover:bg-[var(--surface-3)]" style={{color:'var(--text-3)'}}>
            {theme==='dark'?<Sun size={12}/>:<Moon size={12}/>}
          </button>
          <button onClick={handleLogout} className="p-1.5 rounded-[6px] transition-colors hover:bg-[var(--surface-3)]" style={{color:'var(--text-3)'}}>
            <LogOut size={12}/>
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children:React.ReactNode }) {
  const [mob, setMob] = useState(false)
  useSocket()

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'var(--bg)'}}>
      {/* Desktop sidebar */}
      <aside id="desktop-sidebar" className="hidden md:flex flex-col flex-shrink-0"
        style={{width:192,background:'var(--sidebar)',borderRight:'1px solid var(--border)'}}>
        <Sidebar/>
      </aside>

      {/* Mobile overlay */}
      {mob&&(
        <div className="fixed inset-0 z-40 md:hidden ai2" onClick={()=>setMob(false)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}/>
          <aside className="absolute left-0 top-0 bottom-0 flex flex-col ai" style={{width:220,background:'var(--sidebar)',borderRight:'1px solid var(--border)',zIndex:1}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 h-[54px]" style={{borderBottom:'1px solid var(--border)'}}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-[7px] g gl"/>
                <span className="font-bold text-[13px]" style={{color:'var(--text)'}}>SalesPilot</span>
              </div>
              <button onClick={()=>setMob(false)} style={{color:'var(--text-3)'}}><X size={16}/></button>
            </div>
            <Sidebar close={()=>setMob(false)}/>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between flex-shrink-0 px-5 h-[54px]"
          style={{background:'var(--surface)',borderBottom:'1px solid var(--border)'}}>
          <button className="md:hidden" onClick={()=>setMob(true)} style={{color:'var(--text-3)'}}><Menu size={18}/></button>
          <div className="hidden md:block"/>
          <NotificationsBell/>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto" style={{padding:'22px 26px'}}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
