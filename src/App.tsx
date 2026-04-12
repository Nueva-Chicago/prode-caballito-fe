import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTeamBadgesStore } from '@/store/teamBadgesStore'
import { applyTheme } from '@/utils/theme'
import { Navbar } from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui/Toast'
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

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
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
          <RequireAuth><AppLayout><Home /></AppLayout></RequireAuth>
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
          <RequireAuth><AppLayout><Messages /></AppLayout></RequireAuth>
        } />
        <Route path="/messages/:userId" element={
          <RequireAuth><AppLayout><Messages /></AppLayout></RequireAuth>
        } />
        <Route path="/reglamento" element={
          <RequireAuth><AppLayout><Reglamento /></AppLayout></RequireAuth>
        } />
        <Route path="/planilla/:planillaId" element={
          <RequireAuth><AppLayout><Planilla /></AppLayout></RequireAuth>
        } />
        <Route path="/tournaments" element={
          <RequireAuth><AppLayout><Tournaments /></AppLayout></RequireAuth>
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
