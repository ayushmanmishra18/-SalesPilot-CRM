import { create } from 'zustand'

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
    return JSON.parse(atob(token.split('.')[1]!))
  } catch { return null }
}

const stored = {
  access:  localStorage.getItem('accessToken'),
  refresh: localStorage.getItem('refreshToken'),
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:       stored.access,
  refreshToken:      stored.refresh,
  user:              stored.access ? parseJwt(stored.access) : null,
  mustResetPassword: false,

  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    set({ accessToken: access, refreshToken: refresh, user: parseJwt(access) })
  },

  setUser: (user) => set({ user }),

  setMustReset: (v) => set({ mustResetPassword: v }),

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ accessToken: null, refreshToken: null, user: null, mustResetPassword: false })
  },
}))
