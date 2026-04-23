import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTeamBadgesStore } from '@/store/teamBadgesStore'
import { applyTheme } from '@/utils/theme'
import { Navbar } from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui/Toast'
import { AdBanner } from '@/components/ui/AdBanner'
import { GoogleAdUnit } from '@/components/ui/GoogleAdUnit'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Home } from '@/pages/Home'
import { Apuestas } from '@/pages/Apuestas'
import { Matriz } from '@/pages/Matriz'
import { Ranking } from '@/pages/Ranking'
import { Profile } from '@/pages/Profile'
import { Messages } from '@/pages/Messages'
import { Admin } from '@/pages/Admin'
import { Reglamento } from '@/pages/Reglamento'
import { Planilla } from '@/pages/Planilla'
import { Tournaments } from '@/pages/Tournaments'
import { Fixture } from '@/pages/Fixture'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user || user.rol !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function AppLayout({ children, showAd = true }: { children: React.ReactNode, showAd?: boolean }) {
  return (
    <div className="min-h-screen t-text-page transition-colors duration-300" style={{ background: 'var(--theme-page-bg)' }}>
      <Navbar />
      <AdBanner />
      {showAd && <GoogleAdUnit slot="XXXXXXXXXX" />}
      <main className="pb-14 md:pb-0">{children}</main>
    </div>
  )
}

export default function App() {
  const { user } = useAuthStore()
  const loadBadges = useTeamBadgesStore(s => s.load)

  useEffect(() => {
    applyTheme(user?.tema_equipo ?? 'neutral')
  }, [user?.tema_equipo])

  useEffect(() => { loadBadges() }, [])

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Públicas */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Privadas */}
        <Route path="/" element={
          <RequireAuth><AppLayout showAd={false}><Home /></AppLayout></RequireAuth>
        } />
        <Route path="/apuestas" element={
          <RequireAuth><AppLayout><Apuestas /></AppLayout></RequireAuth>
        } />
        <Route path="/matriz" element={
          <RequireAuth><AppLayout><Matriz /></AppLayout></RequireAuth>
        } />
        <Route path="/ranking" element={
          <RequireAuth><AppLayout><Ranking /></AppLayout></RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth><AppLayout><Profile /></AppLayout></RequireAuth>
        } />
        <Route path="/messages" element={
          <RequireAuth><RequireAdmin><AppLayout><Messages /></AppLayout></RequireAdmin></RequireAuth>
        } />
        <Route path="/messages/:userId" element={
          <RequireAuth><RequireAdmin><AppLayout><Messages /></AppLayout></RequireAdmin></RequireAuth>
        } />
        <Route path="/reglamento" element={
          <RequireAuth><AppLayout><Reglamento /></AppLayout></RequireAuth>
        } />
        <Route path="/planilla/:planillaId" element={
          <RequireAuth><AppLayout><Planilla /></AppLayout></RequireAuth>
        } />
        <Route path="/tournaments" element={
          <RequireAuth><RequireAdmin><AppLayout><Tournaments /></AppLayout></RequireAdmin></RequireAuth>
        } />
        <Route path="/fixture" element={
          <RequireAuth><AppLayout><Fixture /></AppLayout></RequireAuth>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <RequireAuth><RequireAdmin><AppLayout><Admin /></AppLayout></RequireAdmin></RequireAuth>
        } />
        <Route path="/admin/planillas" element={
          <RequireAuth><RequireAdmin><AppLayout><Admin /></AppLayout></RequireAdmin></RequireAuth>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
