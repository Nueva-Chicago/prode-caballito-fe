import { useRef, useState, useEffect, useMemo } from 'react'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useT } from '@/hooks/useT'
import { TEAM_THEMES } from '@/types'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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

// Redimensiona y comprime una imagen usando Canvas. Devuelve base64 sin el prefijo data:...
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
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

function parsePhone(full: string): { code: string; local: string } {
  if (!full) return { code: '+54', local: '' }
  const match = COUNTRY_CODES.find(c => full.startsWith(c.code))
  if (match) return { code: match.code, local: full.slice(match.code.length) }
  return { code: '+54', local: full.replace(/^\+/, '') }
}

export function Profile() {
  const { user, updateUser } = useAuthStore()
  const { show } = useToastStore()
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [editName, setEditName] = useState(false)
  const [nombre, setNombre] = useState(user?.nombre || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const initPhone = useMemo(() => parsePhone(user?.whatsapp_number || ''), [])
  const [waCountry, setWaCountry] = useState(initPhone.code)
  const [waLocal, setWaLocal] = useState(initPhone.local)
  const [waConsent, setWaConsent] = useState(user?.whatsapp_consent ?? true)
  const [savingWa, setSavingWa] = useState(false)
  const push = usePushNotifications()

  // Cargar datos frescos al montar para asegurar whatsapp_number actualizado
  useEffect(() => {
    if (!user?.id) return
    api.get(`/users/${user.id}`).then(({ data }) => {
      const u = data.data
      updateUser({ whatsapp_number: u.whatsapp_number, whatsapp_consent: u.whatsapp_consent })
      const parsed = parsePhone(u.whatsapp_number || '')
      setWaCountry(parsed.code)
      setWaLocal(parsed.local)
      setWaConsent(u.whatsapp_consent ?? true)
    }).catch(() => { /* silencioso */ })
  }, [user?.id])

  const handleSaveName = async () => {
    try {
      await api.put(`/users/${user!.id}`, { nombre })
      updateUser({ nombre })
      setEditName(false)
      show(t.profile.nameUpdated, 'success')
    } catch {
      show(t.profile.errorUpdate, 'error')
    }
  }

  const waNumber = waLocal ? `${waCountry}${waLocal}` : ''

  const handleSaveWhatsapp = async () => {
    setSavingWa(true)
    try {
      const { data } = await api.put(`/users/${user!.id}`, {
        whatsapp_number: waConsent ? waNumber : '',
        whatsapp_consent: waConsent,
      })
      updateUser({ whatsapp_number: data.data.whatsapp_number, whatsapp_consent: data.data.whatsapp_consent })
      show(waConsent && waNumber ? t.profile.whatsappSaved : t.profile.whatsappRemoved, 'success')
    } catch {
      show(t.profile.errorUpdate, 'error')
    } finally {
      setSavingWa(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      // Redimensionar y comprimir en cliente antes de subir (evita 413 de API Gateway)
      const base64 = await compressImage(file, 600, 0.82)
      const { data } = await api.post('/users/upload-avatar', {
        image: base64,
        fileName: file.name.replace(/\.[^.]+$/, '.jpg'),
        contentType: 'image/jpeg',
      })
      updateUser({ foto_url: data.data.url })
      show(t.profile.photoUpdated, 'success')
    } catch {
      show(t.profile.errorPhoto, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleThemeChange = async (tema: string) => {
    // Optimista: aplica el tema visualmente de inmediato
    updateUser({ tema_equipo: tema })
    show(t.profile.themeActivated(TEAM_THEMES[tema]?.name || tema), 'success')
    try {
      await api.put(`/users/${user!.id}`, { tema_equipo: tema })
    } catch { /* silent */ }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-[#006d2e]">{t.profile.title}</h1>

      {/* Foto y nombre */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
            {user.foto_url
              ? <img src={user.foto_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#00923f]/20" />
              : <div className="w-20 h-20 rounded-full bg-[#00923f] flex items-center justify-center text-3xl text-white font-bold">
                  {user.nombre[0].toUpperCase()}
                </div>
            }
            <div className="absolute bottom-0 right-0 bg-[#ffffff] rounded-full p-1 shadow text-sm leading-none">
              {uploadingPhoto ? '⏳' : '✏️'}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex gap-2">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00923f]" />
                <button onClick={handleSaveName} className="bg-[#00923f] text-white px-3 py-1.5 rounded-lg text-sm font-medium">{t.profile.save}</button>
                <button onClick={() => setEditName(false)} className="text-gray-400 text-sm px-2">×</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#006d2e] truncate">{user.nombre}</h2>
                <button onClick={() => setEditName(true)} className="text-gray-400 hover:text-gray-600 text-sm">✏️</button>
              </div>
            )}
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${user.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.rol}
            </span>
          </div>
        </div>
      </div>

      {/* Tema de equipo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-[#006d2e] mb-4">{t.profile.visualTheme}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 isolate">
          {Object.entries(TEAM_THEMES).map(([key, theme]) => {
            const isActive = user.tema_equipo === key
            // Pattern override: si hay patron de camiseta usarlo como fondo del strip
            const stripeBg  = theme.pattern ?? theme.primary
            const fgColor   = theme.fg ?? theme.secondary
            const ringColor = theme.ring ?? theme.primary
            return (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className="rounded-xl overflow-hidden transition-all focus:outline-none"
                style={{
                  boxShadow: isActive
                    ? `0 0 0 3px ${ringColor}, 0 4px 12px rgba(0,0,0,0.15)`
                    : '0 1px 4px rgba(0,0,0,0.10)',
                  transform: isActive ? 'scale(1.05)' : undefined,
                  zIndex: isActive ? 1 : undefined,
                  position: 'relative',
                }}
              >
                {/* Strip con patrón de camiseta */}
                <div className="h-8 flex items-center gap-1.5 px-2" style={{ background: stripeBg }}>
                  <span className="text-[11px] drop-shadow" style={{ color: fgColor }}>⚽</span>
                  <span className="flex-1 h-1.5 rounded-full opacity-50 drop-shadow" style={{ background: fgColor }} />
                  <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: fgColor }} />
                </div>
                {/* Etiqueta del nombre */}
                <div
                  className="py-1.5 px-2 text-xs font-semibold text-center"
                  style={{
                    background: isActive ? theme.primary : '#f9fafb',
                    color: isActive ? theme.secondary : '#374151',
                  }}
                >
                  {theme.name}
                  {isActive && <span className="ml-1">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-[#006d2e]">{t.profile.whatsappTitle}</h3>
        <div className="flex gap-2">
          <select
            value={waCountry}
            onChange={e => setWaCountry(e.target.value)}
            className="border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00923f] bg-white"
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <input
            type="tel"
            value={waLocal}
            onChange={e => setWaLocal(e.target.value.replace(/\D/g, ''))}
            placeholder={t.profile.whatsappPlaceholder}
            maxLength={12}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00923f]"
          />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={waConsent}
            onChange={e => setWaConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#00923f] shrink-0"
          />
          <span className="text-xs text-gray-500 leading-relaxed">{t.profile.whatsappConsent}</span>
        </label>
        <button
          onClick={handleSaveWhatsapp}
          disabled={savingWa || (waConsent && !waNumber)}
          className="w-full bg-[#006d2e] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#002870] transition-colors disabled:opacity-40"
        >
          {savingWa ? '...' : t.profile.save}
        </button>
      </div>

      {/* Push Notifications */}
      {push.state !== 'unsupported' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-bold text-[#006d2e]">🔔 Notificaciones push</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Recibí alertas en tu dispositivo cuando se publique un resultado, cuando tu partido esté por comenzar o cuando seas el nuevo líder del ranking — incluso con la app cerrada.
          </p>
          {push.state === 'denied' && (
            <p className="text-xs text-red-500 font-medium">
              Las notificaciones están bloqueadas. Habilitálas desde la configuración del navegador.
            </p>
          )}
          {push.state === 'subscribed' ? (
            <button
              onClick={push.unsubscribe}
              disabled={push.loading}
              className="w-full border border-gray-200 text-gray-500 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              {push.loading ? '...' : '🔕 Desactivar notificaciones'}
            </button>
          ) : (
            <button
              onClick={push.subscribe}
              disabled={push.loading || push.state === 'denied'}
              className="w-full bg-[#006d2e] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#002870] transition-colors disabled:opacity-40"
            >
              {push.loading ? '...' : '🔔 Activar notificaciones'}
            </button>
          )}
        </div>
      )}

    </div>
  )
}
