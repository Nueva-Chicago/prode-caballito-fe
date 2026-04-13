import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { api } from '@/api/client'

export function Navbar() {
  const { user, logout, updateUser, isAdmin } = useAuthStore()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switchingLang, setSwitchingLang] = useState(false)

  const navLinks = [
    { to: '/',            label: t.nav.home,        icon: '🏠' },
    { to: '/apuestas',    label: t.nav.bets,         icon: '⚽' },
    { to: '/matriz',      label: t.nav.matrix,       icon: '📊' },
    { to: '/ranking',     label: t.nav.ranking,      icon: '🏆' },
    { to: '/tournaments', label: t.nav.tournaments,  icon: '🎯' },
    { to: '/messages',    label: t.nav.messages,     icon: '💬' },
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
          <span className="hidden sm:block text-sm font-semibold">PRODE Caballito</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
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
            title={user.idioma_pref === 'pt' ? 'Mudar para Español' : 'Mudar para Português'}
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
          {navLinks.map((l) => (
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
            {user.idioma_pref === 'pt' ? 'Cambiar a Español' : 'Mudar para Português'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-red-300 mt-2 border-t border-white/10 pt-3">
            <span>🚪</span>{t.nav.logoutMobile}
          </button>
        </div>
      )}
    </nav>
  )
}
