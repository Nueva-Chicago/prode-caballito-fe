import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { show } = useToastStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.data.user, data.data.token, data.data.refreshToken)
      navigate('/apuestas')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al iniciar sesión'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0042A5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] px-8 py-6 text-center">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-white font-bold text-2xl">PRODE Caballito</h1>
          <p className="text-[#FFDF00] text-sm mt-1">Qatar 2026</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
              placeholder="tu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
              placeholder="••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0042A5] text-white font-bold py-3 rounded-xl hover:bg-[#003080] disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
          <p className="text-center text-sm text-gray-500">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-[#0042A5] font-semibold hover:underline">
              Registrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
