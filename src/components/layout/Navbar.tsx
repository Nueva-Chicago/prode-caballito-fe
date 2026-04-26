import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { api } from '@/api/client'
import { GanadoresModal } from './GanadoresModal'

export function Navbar() {
  const { user, logout, updateUser, isAdmin } = useAuthStore()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switchingLang, setSwitchingLang] = useState(false)
  const [showGanadores, setShowGanadores] = useState(false)

  const navLinks = [
    { to: '/',                          label: t.nav.home,    icon: '🏠' },
    { to: '/apuestas',                  label: t.nav.bets,    icon: '⚽' },
    { to: '/matriz',                    label: t.nav.matrix,  icon: '📊' },
    { to: '/ranking',                   label: t.nav.ranking, icon: '🏆' },
    { to: '/fixture',                   label: t.nav.fixture, icon: '🗓️' },
    { to: '/reglamento',                label: t.nav.rules,   icon: '📖' },
    { to: '/premios.html',      label: t.nav.prizes,  icon: '🎁', external: true },
  ]

  const adminLinks = [
    { to: '/messages', label: t.nav.messages, icon: '💬' },
  ]

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }) } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const handleToggleLang = async () => {
    if (!user || switchingLang) return
    const newLang = user.idioma_pref === 'pt' ? 'es' : 'pt'
    // Actualización optimista: cambia en el store + localStorage inmediatamente
    updateUser({ idioma_pref: newLang })
    setSwitchingLang(true)
    try {
      await api.put(`/users/${user.id}`, { idioma_pref: newLang })
    } catch { /* silent — localStorage ya tiene el valor correcto */ }
    finally {
      setSwitchingLang(false)
    }
  }

  if (!user) return null

  const langFlag = user.idioma_pref === 'pt' ? '🇧🇷' : '🇦🇷'

  return (
    <nav
      className="text-white shadow-lg sticky top-0 z-40"
      style={{ background: 'var(--theme-nav-bg)' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span style={{ color: 'var(--theme-secondary)' }}>⚽</span>
          <span className="hidden sm:block text-sm font-semibold">PRODE Nueva Chicago</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => l.external ? (
            <a
              key={l.to}
              href={l.to}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            >
              {l.icon} {l.label}
            </a>
          ) : (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={location.pathname === l.to
                ? { background: 'rgba(255,255,255,0.18)', color: 'var(--theme-secondary)' }
                : undefined}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setShowGanadores(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
          >
            🏆 {t.nav.winners}
          </button>
          {isAdmin() && adminLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={location.pathname === l.to
                ? { background: 'rgba(255,255,255,0.18)', color: 'var(--theme-secondary)' }
                : undefined}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
              style={location.pathname.startsWith('/admin')
                ? { background: 'rgba(255,255,255,0.18)', color: 'var(--theme-secondary)' }
                : undefined}
            >
              {t.nav.admin}
            </Link>
          )}
        </div>

        {/* Right: lang toggle + avatar */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={handleToggleLang}
            disabled={switchingLang}
            title={t.nav.switchLang}
            className="text-lg leading-none px-1 py-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {langFlag}
          </button>

          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user.foto_url
              ? <img src={user.foto_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
              : <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--theme-primary)', color: 'var(--theme-on-primary)' }}
                >
                  {user.nombre[0].toUpperCase()}
                </div>
            }
            <span className="hidden sm:block text-sm max-w-[120px] truncate">{user.nombre}</span>
          </Link>
          <button onClick={handleLogout} className="hidden md:block text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
            {t.nav.logout}
          </button>

          {/* Mobile hamburger */}
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1"
          style={{ background: 'var(--theme-nav-bg-2)' }}
        >
          {navLinks.map((l) => l.external ? (
            <a key={l.to} href={l.to} target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </a>
          ) : (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
          <button
            onClick={() => { setShowGanadores(true); setMenuOpen(false) }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white w-full text-left"
          >
            <span>🏆</span>{t.nav.winners}
          </button>
          {isAdmin() && adminLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>⚙️</span>{t.nav.admin}
            </Link>
          )}
          <button onClick={handleToggleLang} disabled={switchingLang}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80">
            <span className="text-base">{langFlag}</span>
            {t.nav.switchLang}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-red-300 mt-2 border-t border-white/10 pt-3">
            <span>🚪</span>{t.nav.logoutMobile}
          </button>
        </div>
      )}

      {showGanadores && <GanadoresModal onClose={() => setShowGanadores(false)} />}

      {/* Mobile bottom tab bar — compacto, fuera del <nav> sticky */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {[...navLinks.filter(l => !l.external), ...(isAdmin() ? adminLinks : [])].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 transition-colors"
            style={location.pathname === l.to
              ? { color: 'var(--theme-primary)' }
              : { color: '#9ca3af' }}
          >
            <span className="text-base leading-none">{l.icon}</span>
            <span className="text-[9px] font-medium leading-none">{l.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
