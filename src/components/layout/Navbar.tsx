import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/api/client'

const navLinks = [
  { to: '/',          label: 'Inicio',        icon: '🏠' },
  { to: '/apuestas',  label: 'Pronósticos',   icon: '⚽' },
  { to: '/matriz',    label: 'Matriz',         icon: '📊' },
  { to: '/ranking',   label: 'Ranking',        icon: '🏆' },
  { to: '/messages',  label: 'Mensajes',       icon: '💬' },
]

export function Navbar() {
  const { user, logout, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }) } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav className="bg-[#001A4B] text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="text-[#FFDF00]">⚽</span>
          <span className="hidden sm:block text-sm font-semibold">PRODE Caballito</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? 'bg-white/20 text-[#FFDF00]'
                  : 'hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link to="/admin" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname.startsWith('/admin') ? 'bg-white/20 text-[#FFDF00]' : 'hover:bg-white/10'}`}>
              Admin
            </Link>
          )}
        </div>

        {/* Right: avatar + menu */}
        <div className="flex items-center gap-2">
          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user.foto_url
              ? <img src={user.foto_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/30" />
              : <div className="w-8 h-8 rounded-full bg-[#0042A5] flex items-center justify-center text-sm font-bold">{user.nombre[0].toUpperCase()}</div>
            }
            <span className="hidden sm:block text-sm max-w-[120px] truncate">{user.nombre}</span>
          </Link>
          <button onClick={handleLogout} className="hidden md:block text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
            Salir
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
        <div className="md:hidden bg-[#002B7F] border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>⚙️</span>Admin
            </Link>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-red-300 mt-2 border-t border-white/10 pt-3">
            <span>🚪</span>Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  )
}
