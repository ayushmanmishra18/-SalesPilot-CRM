import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth'
import { AppShell } from './components/layout/AppShell'

// auth pages
import LoginPage         from './pages/auth/LoginPage'
import AcceptInvitePage  from './pages/auth/AcceptInvitePage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// app pages
import DashboardPage    from './pages/dashboard/DashboardPage'
import ContactsPage     from './pages/contacts/ContactsPage'
import ContactDetailPage from './pages/contacts/ContactDetailPage'
import PipelinePage     from './pages/pipeline/PipelinePage'
import DealDetailPage   from './pages/deals/DealDetailPage'
import UsersPage        from './pages/users/UsersPage'
import SettingsPage     from './pages/settings/SettingsPage'

// admin (separate flow)
import AdminPage       from './pages/admin/AdminPage'
import AnalyticsPage   from './pages/analytics/AnalyticsPage'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import LandingPage from './pages/landing/LandingPage'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function ProtectedLayout() {
  const token      = useAuthStore(s => s.accessToken)
  const mustReset  = useAuthStore(s => s.mustResetPassword)
  if (!token)     return <Navigate to="/login" replace />
  if (mustReset)  return <Navigate to="/reset-password" replace />
  return <AppShell><ErrorBoundary><Outlet /></ErrorBoundary></AppShell>
}

function PublicOnly() {
  const token = useAuthStore(s => s.accessToken)
  if (token) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Landing page — public, no shell */}
          <Route path="/" element={<LandingPage />} />

          {/* Public auth */}
          <Route element={<PublicOnly />}>
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/accept-invite"  element={<AcceptInvitePage />} />
          </Route>

          {/* Semi-protected — needs token but not full shell */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin panel — separate identity, no AppShell */}
          <Route path="/admin" element={<AdminPage />} />

          {/* Protected app */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/contacts"         element={<ContactsPage />} />
            <Route path="/contacts/:id"     element={<ContactDetailPage />} />
            <Route path="/pipeline"         element={<PipelinePage />} />
            <Route path="/deals/:id"        element={<DealDetailPage />} />
            <Route path="/users"            element={<UsersPage />} />
            <Route path="/settings"         element={<SettingsPage />} />
            <Route path="/analytics"        element={<AnalyticsPage />} />
            <Route path="*"                 element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="/" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
