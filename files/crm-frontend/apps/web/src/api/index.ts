import axios from 'axios'

const BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001'

// Main API instance for user/tenant operations (includes user token interceptor)
export const api = axios.create({
  baseURL:        BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Request-Id': crypto.randomUUID() },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken',  data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Separate axios instance for admin operations (no user token, uses adminToken)
const adminAxios = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

adminAxios.interceptors.request.use(config => {
  const adminToken = localStorage.getItem('adminToken')
  if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
  return config
})

export function newIdempotencyKey() { return crypto.randomUUID() }

export const authApi = {
  login:         (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout:        (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  resetPassword: (password: string, confirmPassword: string) => api.post('/auth/reset-password', { password, confirmPassword }),
  acceptInvite:  (token: string, password: string) => api.post('/auth/accept-invite', { token, password }),
}

export const usersApi = {
  list:       () => api.get('/users'),
  invite:     (data: { email: string; name: string; role: string }, key: string) =>
    api.post('/users/invite', data, { headers: { 'Idempotency-Key': key } }),
  updateRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
  remove:     (id: string) => api.delete(`/users/${id}`),
}

export const contactsApi = {
  list:      (params?: { q?: string; page?: number; source?: string; leadStatus?: string }) =>
    api.get('/contacts', { params }),
  get:       (id: string) => api.get(`/contacts/${id}`),
  create:    (data: any, key: string) => api.post('/contacts', data, { headers: { 'Idempotency-Key': key } }),
  update:    (id: string, data: any) => api.patch(`/contacts/${id}`, data),
  setAction: (id: string, data: any) => api.patch(`/contacts/${id}/next-action`, data),
  remove:    (id: string) => api.delete(`/contacts/${id}`),
}

export const dealsApi = {
  list:      (params?: { status?: string; stage?: string; ownerId?: string }) => api.get('/deals', { params }),
  get:       (id: string) => api.get(`/deals/${id}`),
  create:    (data: any, key: string) => api.post('/deals', data, { headers: { 'Idempotency-Key': key } }),
  update:    (id: string, data: any) => api.patch(`/deals/${id}`, data),
  moveStage: (id: string, stage: string) => api.patch(`/deals/${id}/stage`, { stage }),
  setAction: (id: string, data: any) => api.patch(`/deals/${id}/next-action`, data),
  close:     (id: string, data: { status: 'won' | 'lost'; lostReason?: string }) => api.post(`/deals/${id}/close`, data),
  remove:    (id: string) => api.delete(`/deals/${id}`),
}

export const activitiesApi = {
  list:          (relatedTo: string, page = 1) => api.get('/activities', { params: { relatedTo, page } }),
  create:        (data: any, key: string) => api.post('/activities', data, { headers: { 'Idempotency-Key': key } }),
  convertToTask: (id: string, data: any) => api.post(`/activities/${id}/convert-to-task`, data),
  complete:      (id: string) => api.patch(`/activities/${id}/complete`),
}

export const dashboardApi = {
  followups: () => api.get('/dashboard/followups'),
  summary:   () => api.get('/dashboard/summary'),
}

export const notificationsApi = {
  list:    () => api.get('/notifications'),
  read:    (id: string) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch('/notifications/read-all'),
}

export const adminApi = {
  login:       (email: string, password: string) => adminAxios.post('/admin/login', { email, password }),
  listTenants: () => adminAxios.get('/admin/tenants'),
  addTenant:   (data: any) => adminAxios.post('/admin/tenants', data),
  suspend:     (id: string) => adminAxios.patch(`/admin/tenants/${id}/suspend`),
  reactivate:  (id: string) => adminAxios.patch(`/admin/tenants/${id}/reactivate`),
  listLeads:   () => adminAxios.get('/admin/leads'),
  markContacted: (id: string) => adminAxios.patch(`/admin/leads/${id}/contacted`),
}

export const analyticsApi = {
  pipeline:   () => api.get('/analytics/pipeline'),
  reps:       () => api.get('/analytics/reps'),
  activities: () => api.get('/analytics/activities'),
  funnel:     () => api.get('/analytics/funnel'),
  forecast:   () => api.get('/analytics/forecast'),
}

export const emailApi = {
  accounts:      () => api.get('/email/accounts'),
  connectGoogle: () => api.get('/email/connect/google'),
  callback:      (code: string) => api.post('/email/connect/google/callback', { code }),
  send:          (data: { to: string; subject: string; body: string }) => api.post('/email/send', data),
  disconnect:    (id: string) => api.delete(`/email/accounts/${id}`),
}

export const documentsApi = {
  list:   (relatedTo: string) => api.get('/documents', { params: { relatedTo } }),
  upload: (data: any) => api.post('/documents', data),
  remove: (id: string) => api.delete(`/documents/${id}`),
}

export const settingsApi = {
  get:        () => api.get('/settings'),
  update:     (data: any) => api.patch('/settings', data),
  updateStages:(stages: any[]) => api.patch('/settings/stages', { stages }),
  updateSla:  (data: any) => api.patch('/settings/sla', data),
}
