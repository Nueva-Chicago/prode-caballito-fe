import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'

type Step = 'form' | 'verify' | 'complete' | 'notify'

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
  const { setAuth, updateUser } = useAuthStore()
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
  const [waConsent, setWaConsent] = useState(true)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'dismissed'>('idle')

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
        whatsapp_consent: waConsent,
      })

      // Auto-login primero para que el store tenga el usuario
      if (data.data?.token && data.data?.user) {
        setAuth(data.data.user, data.data.token, data.data.refreshToken)
      }

      // Upload photo if selected — después del login para poder actualizar el store
      if (photoFile && data.data?.token) {
        try {
          const base64 = await compressImage(photoFile, 600, 0.82)
          const photoRes = await api.post('/users/upload-avatar', {
            image: base64,
            fileName: photoFile.name.replace(/\.[^.]+$/, '.jpg'),
            contentType: 'image/jpeg',
          }, {
            headers: { Authorization: `Bearer ${data.data.token}` }
          })
          if (photoRes.data?.data?.url) {
            updateUser({ foto_url: photoRes.data.data.url })
          }
        } catch {
          // Photo upload fails silently — user can retry from profile
        }
      }

      if (data.data?.token && data.data?.user) {
        show('¡Bienvenido a ProdeCaballito!', 'success')
        // Si el navegador soporta notificaciones y aún no se respondió → paso notify
        if ('Notification' in window && Notification.permission === 'default') {
          setStep('notify')
        } else {
          navigate('/')
        }
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

  const handleAllowNotifications = async () => {
    setNotifStatus('requesting')
    try {
      const result = await Notification.requestPermission()
      setNotifStatus(result === 'granted' ? 'granted' : 'denied')
      // Breve pausa para mostrar el estado antes de navegar
      setTimeout(() => navigate('/'), result === 'granted' ? 1400 : 800)
    } catch {
      setNotifStatus('dismissed')
      setTimeout(() => navigate('/'), 600)
    }
  }

  const handleSkipNotifications = () => navigate('/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0042A5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] px-8 py-5 text-center">
          <h1 className="text-white font-bold text-xl">Crear cuenta</h1>

          {/* Stepper con etiquetas */}
          {(() => {
            const STEPS = [
              { key: 'form',     label: 'Cuenta' },
              { key: 'verify',   label: 'Email' },
              { key: 'complete', label: 'Perfil' },
              { key: 'notify',   label: 'Avisos' },
            ] as const
            const currentIdx = STEPS.findIndex(s => s.key === step)
            return (
              <div className="flex items-center justify-center mt-4 gap-0">
                {STEPS.map((s, i) => {
                  const done    = i < currentIdx
                  const active  = i === currentIdx
                  return (
                    <div key={s.key} className="flex items-center">
                      {/* Línea izquierda */}
                      {i > 0 && (
                        <div className={`w-10 h-px transition-colors ${i <= currentIdx ? 'bg-[#FFDF00]' : 'bg-white/25'}`} />
                      )}
                      {/* Círculo + label */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          done   ? 'bg-[#FFDF00] text-[#001A4B]' :
                          active ? 'bg-[#FFDF00] text-[#001A4B] ring-2 ring-white/40 ring-offset-1 ring-offset-transparent' :
                                   'bg-white/20 text-white/50'
                        }`}>
                          {done ? '✓' : i + 1}
                        </div>
                        <span className={`text-[9px] font-semibold tracking-wide uppercase transition-colors ${
                          active || done ? 'text-[#FFDF00]' : 'text-white/35'
                        }`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        <div className="p-8">
          {step === 'form' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-sm text-gray-500 text-center mb-2">Ingresá tus datos para crear tu cuenta</p>
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
                <label className="flex items-start gap-2.5 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={waConsent}
                    onChange={e => setWaConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#0042A5] shrink-0"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">Acepto que mi número sea visible para otros jugadores en la Matriz</span>
                </label>
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

          {step === 'notify' && (
            <div className="flex flex-col items-center text-center gap-5">

              {/* Ícono */}
              <div className="w-20 h-20 rounded-full bg-[#001A4B]/8 flex items-center justify-center text-5xl">
                {notifStatus === 'granted'  ? '✅' :
                 notifStatus === 'denied'   ? '🔕' :
                                             '🔔'}
              </div>

              {/* Título y descripción */}
              {notifStatus === 'idle' || notifStatus === 'requesting' ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-[#001A4B] mb-1">Activá las notificaciones</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Avisamos cuando cierran los pronósticos, se publican resultados y alguien te supera en el ranking.
                    </p>
                  </div>

                  <ul className="w-full text-left space-y-2.5">
                    {[
                      { icon: '⏰', text: 'Recordatorios antes del cierre de apuestas' },
                      { icon: '⚽', text: 'Resultados publicados al instante' },
                      { icon: '📊', text: 'Alertas de ranking cuando alguien te alcanza' },
                    ].map(({ icon, text }) => (
                      <li key={text} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                        <span className="text-xl shrink-0">{icon}</span>
                        <span className="text-sm text-gray-700 font-medium">{text}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="w-full space-y-3 pt-1">
                    <button
                      onClick={handleAllowNotifications}
                      disabled={notifStatus === 'requesting'}
                      className="w-full bg-[#001A4B] text-white font-bold py-3.5 rounded-xl hover:bg-[#002870] disabled:opacity-60 transition-colors text-sm"
                    >
                      {notifStatus === 'requesting' ? 'Esperando permiso...' : 'Activar notificaciones'}
                    </button>
                    <button
                      onClick={handleSkipNotifications}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
                    >
                      Ahora no
                    </button>
                  </div>
                </>
              ) : notifStatus === 'granted' ? (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-[#001A4B] mb-1">¡Todo listo!</h2>
                    <p className="text-sm text-gray-500">Notificaciones activadas. Ingresando al Prode...</p>
                  </div>
                  <div className="w-8 h-8 border-3 border-[#0042A5] border-t-transparent rounded-full animate-spin" />
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-bold text-[#001A4B] mb-1">Sin notificaciones</h2>
                    <p className="text-sm text-gray-500">Podés activarlas en cualquier momento desde el perfil.</p>
                  </div>
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-transparent rounded-full animate-spin" />
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
