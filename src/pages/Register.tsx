import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'

type Step = 'form' | 'verify' | 'complete'

export function Register() {
  const navigate = useNavigate()
  const { show } = useToastStore()
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [tema, setTema] = useState('neutral')
  const [telefono, setTelefono] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register-pending', form)
      setPendingId(data.data.pendingId)
      setStep('verify')
      show('Código enviado a tu email', 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al registrarse'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-email', { pendingId, code })
      setUserId(data.data.userId)
      setStep('complete')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Código inválido'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-code', { pendingId })
      show('Código reenviado ✓', 'success')
    } catch {
      show('Error al reenviar', 'error')
    }
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/complete-registration', { userId, tema_equipo: tema, telefono })
      show('¡Registro completado! Iniciá sesión', 'success')
      navigate('/login')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const teams = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'boca', label: '🔵 Boca Juniors' },
    { value: 'river', label: '🔴 River Plate' },
    { value: 'racing', label: '🩵 Racing Club' },
    { value: 'independiente', label: '🔴 Independiente' },
    { value: 'san_lorenzo', label: '🔵 San Lorenzo' },
    { value: 'estudiantes', label: '🔴 Estudiantes' },
    { value: 'huracan', label: '⚪ Huracán' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0042A5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] px-8 py-5 text-center">
          <h1 className="text-white font-bold text-xl">Crear cuenta</h1>
          <div className="flex justify-center gap-2 mt-3">
            {(['form','verify','complete'] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s || (step === 'verify' && i < 1) || (step === 'complete') ? 'bg-[#FFDF00]' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-8">
          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="Tu nombre" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="tu@email.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0042A5] text-white font-bold py-3 rounded-xl hover:bg-[#003080] disabled:opacity-50 transition-colors">
                {loading ? 'Enviando...' : 'Continuar →'}
              </button>
              <p className="text-center text-sm text-gray-500">
                ¿Ya tenés cuenta?{' '}
                <Link to="/login" className="text-[#0042A5] font-semibold hover:underline">Iniciá sesión</Link>
              </p>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Enviamos un código de 6 dígitos a <strong>{form.email}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Código de verificación</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                  className="w-full border-2 border-[#0042A5] rounded-xl px-4 py-3 focus:outline-none text-2xl font-bold text-center tracking-widest"
                  placeholder="000000" maxLength={6} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0042A5] text-white font-bold py-3 rounded-xl hover:bg-[#003080] disabled:opacity-50 transition-colors">
                {loading ? 'Verificando...' : 'Verificar →'}
              </button>
              <button type="button" onClick={handleResend} className="w-full text-sm text-gray-500 hover:text-[#0042A5]">
                ¿No llegó? Reenviar código
              </button>
            </form>
          )}

          {step === 'complete' && (
            <form onSubmit={handleComplete} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">¡Email verificado! Completá tu perfil:</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📱 Número de teléfono</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1112345678"
                  maxLength={15}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Sin código de país. Podés modificarlo después desde tu perfil.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">🏟️ Equipo favorito</p>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map((t) => (
                    <button key={t.value} type="button" onClick={() => setTema(t.value)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${tema === t.value ? 'border-[#0042A5] bg-blue-50 text-[#0042A5]' : 'border-gray-200 hover:border-gray-300'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#FFDF00] text-[#001A4B] font-bold py-3 rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                {loading ? 'Guardando...' : '🎉 ¡Completar registro!'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
