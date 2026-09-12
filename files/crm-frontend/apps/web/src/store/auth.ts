import { create } from 'zustand'
import { api } from '../api'

interface AuthState {
  accessToken:       string | null
  refreshToken:      string | null
  user:              { userId: string; tenantId: string; role: string } | null
  mustResetPassword: boolean
  setTokens:    (access: string, refresh: string) => void
  setUser:      (user: AuthState['user']) => void
  setMustReset: (v: boolean) => void
  logout:       () => void
}

function parseJwt(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!))
    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null // Token expired
    }
    return payload
  } catch { return null }
}

const stored = {
  access:  localStorage.getItem('accessToken'),
  refresh: localStorage.getItem('refreshToken'),
}

// Validate stored tokens on init
const initialAccess = stored.access ? parseJwt(stored.access) : null
const initialUser = initialAccess ? { userId: initialAccess.userId, tenantId: initialAccess.tenantId, role: initialAccess.role } : null

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:       initialAccess ? stored.access : null,
  refreshToken:      initialAccess ? stored.refresh : null,
  user:              initialUser,
  mustResetPassword: false,

  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    const payload = parseJwt(access)
    set({ accessToken: access, refreshToken: refresh, user: payload ? { userId: payload.userId, tenantId: payload.tenantId, role: payload.role } : null })
  },

  setUser: (user) => set({ user }),

  setMustReset: (v) => set({ mustResetPassword: v }),

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ accessToken: null, refreshToken: null, user: null, mustResetPassword: false })
  },
}))
