import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useTeamBadgesStore } from '@/store/teamBadgesStore'
import { applyTheme } from '@/utils/theme'
import { Navbar } from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui/Toast'
import { AdBanner } from '@/components/ui/AdBanner'
import { GoogleAdUnit } from '@/components/ui/GoogleAdUnit'

const Login      = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const Register   = lazy(() => import('@/pages/Register').then(m => ({ default: m.Register })))
const Home       = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })))
const Apuestas   = lazy(() => import('@/pages/Apuestas').then(m => ({ default: m.Apuestas })))
const Matriz     = lazy(() => import('@/pages/Matriz').then(m => ({ default: m.Matriz })))
const Ranking    = lazy(() => import('@/pages/Ranking').then(m => ({ default: m.Ranking })))
const Profile    = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })))
const Messages   = lazy(() => import('@/pages/Messages').then(m => ({ default: m.Messages })))
const Admin      = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })))
const Reglamento = lazy(() => import('@/pages/Reglamento').then(m => ({ default: m.Reglamento })))
const Planilla   = lazy(() => import('@/pages/Planilla').then(m => ({ default: m.Planilla })))
const Tournaments = lazy(() => import('@/pages/Tournaments').then(m => ({ default: m.Tournaments })))
const Fixture    = lazy(() => import('@/pages/Fixture').then(m => ({ default: m.Fixture })))

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

function AppLayout({ children, adSlot = '4113004001' }: { children: React.ReactNode, adSlot?: string | null }) {
  return (
    <div className="min-h-screen t-text-page transition-colors duration-300" style={{ background: 'var(--theme-page-bg)' }}>
      <Navbar />
      <AdBanner />
      {adSlot && <GoogleAdUnit slot={adSlot} />}
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
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00923f]" />
        </div>
      }>
      <Routes>
        {/* Públicas */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Privadas */}
        <Route path="/" element={
          <RequireAuth><AppLayout adSlot={null}><Home /></AppLayout></RequireAuth>
        } />
        <Route path="/apuestas" element={
          <RequireAuth><AppLayout adSlot="4004171291"><Apuestas /></AppLayout></RequireAuth>
        } />
        <Route path="/matriz" element={
          <RequireAuth><AppLayout><Matriz /></AppLayout></RequireAuth>
        } />
        <Route path="/ranking" element={
          <RequireAuth><AppLayout adSlot="1540216524"><Ranking /></AppLayout></RequireAuth>
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
      </Suspense>
    </BrowserRouter>
  )
}
