import { create } from 'zustand'
export type Theme = 'dark' | 'light'

const DARK = {
  '--bg':'#080810','--surface':'#0F0F1A','--surface-2':'#161624','--surface-3':'#1C1C2E',
  '--border':'#1E1E30','--border-2':'#252538','--text':'#EEEEF8','--text-2':'#9898B8',
  '--text-3':'#55557A','--sidebar':'#0A0A16','--input':'#080810',
}
const LIGHT = {
  '--bg':'#F0F1F8','--surface':'#FFFFFF','--surface-2':'#F5F6FC','--surface-3':'#ECEDF5',
  '--border':'#E2E4EE','--border-2':'#D8DAE8','--text':'#0C0C18','--text-2':'#52536E',
  '--text-3':'#9899B2','--sidebar':'#F0F1F8','--input':'#FFFFFF',
}

function apply(t: Theme) {
  const vars = t==='dark'?DARK:LIGHT
  const root = document.documentElement
  Object.entries(vars).forEach(([k,v])=>root.style.setProperty(k,v))
  root.setAttribute('data-theme',t)
  localStorage.setItem('crm-theme',t)
}

const saved = (localStorage.getItem('crm-theme') as Theme) ?? 'dark'
if (typeof document!=='undefined') apply(saved)

export const useThemeStore = create<{theme:Theme;toggle:()=>void;set:(t:Theme)=>void}>((set)=>({
  theme: saved,
  toggle: ()=>set(s=>{ const n:Theme=s.theme==='dark'?'light':'dark'; apply(n); return {theme:n} }),
  set: (t)=>set(()=>{ apply(t); return {theme:t} }),
}))
