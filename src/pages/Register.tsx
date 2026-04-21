import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

type Step = 'form' | 'verify' | 'complete'

function compressImage(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

const COUNTRY_CODES = [
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇺🇸', name: 'EE.UU.' },
]

const TEAMS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'boca', label: '🔵 Boca Juniors' },
  { value: 'river', label: '🔴 River Plate' },
  { value: 'racing', label: '🩵 Racing Club' },
  { value: 'independiente', label: '🔴 Independiente' },
  { value: 'san_lorenzo', label: '🔵 San Lorenzo' },
  { value: 'estudiantes', label: '🔴 Estudiantes' },
  { value: 'huracan', label: '⚪ Huracán' },
]

export function Register() {
  const navigate = useNavigate()
  const { show } = useToastStore()
  const { login } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [pendingId, setPendingId] = useState('')
  const [userId, setUserId] = useState('')
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [code, setCode] = useState('')
  const [tema, setTema] = useState('neutral')
  const [countryCode, setCountryCode] = useState('+54')
  const [localPhone, setLocalPhone] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const whatsapp_number = localPhone ? `${countryCode}${localPhone.replace(/\D/g, '')}` : undefined
      const { data } = await api.post('/auth/complete-registration', {
        userId,
        tema_equipo: tema,
        whatsapp_number,
      })

      // Upload photo if selected
      if (photoFile && data.data?.token) {
        try {
          const reader = new FileReader()
          const base64 = await compressImage(photoFile, 600, 0.82)
          await api.post('/users/upload-avatar', {
            image: base64,
            fileName: photoFile.name.replace(/\.[^.]+$/, '.jpg'),
            contentType: 'image/jpeg',
          }, {
            headers: { Authorization: `Bearer ${data.data.token}` }
          })
        } catch {
          // Photo upload fails silently — user can retry from profile
        }
      }

      // Auto-login with returned tokens
      if (data.data?.token && data.data?.user) {
        login(data.data.user, data.data.token, data.data.refreshToken)
        show('¡Bienvenido a ProdeCaballito!', 'success')
        navigate('/')
      } else {
        show('¡Registro completado! Iniciá sesión', 'success')
        navigate('/login')
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al completar el registro'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0042A5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] px-8 py-5 text-center">
          <h1 className="text-white font-bold text-xl">Crear cuenta</h1>
          <div className="flex justify-center gap-2 mt-3">
            {(['form', 'verify', 'complete'] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                step === 'complete' || (step === 'verify' && i <= 1) || (step === 'form' && i === 0)
                  ? 'bg-[#FFDF00]' : 'bg-white/30'
              }`} />
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
            <form onSubmit={handleComplete} className="space-y-5">
              <p className="text-sm text-gray-600 text-center">¡Email verificado! Completá tu perfil:</p>

              {/* Foto de perfil */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-[#0042A5] transition-colors bg-gray-50 flex items-center justify-center"
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <span className="text-3xl">📷</span>
                  }
                </button>
                <span className="text-xs text-gray-400">Foto de perfil (opcional)</span>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>

              {/* Teléfono con código de país */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📱 Número de WhatsApp</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5] bg-white"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={localPhone}
                    onChange={e => setLocalPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="11 1234 5678"
                    maxLength={12}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Opcional. Para recibir notificaciones por WhatsApp.</p>
              </div>

              {/* Equipo favorito */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">🏟️ Equipo favorito</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEAMS.map((t) => (
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
