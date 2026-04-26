// ── Tipos y datos de anunciantes ─────────────────────────────────────────────
// Para producción: reemplazar ADS por un fetch a /api/ads o CMS.

export interface Ad {
  id: string
  logoEmoji: string
  logoText: string
  /** Si se provee, se muestra una imagen en lugar del emoji */
  logoUrl?: string
  headline: string
  subline?: string
  ctaText: string
  ctaUrl: string
  /** CSS background — gradiente o color sólido del anunciante */
  bg: string
  ctaBg: string
  ctaColor: string
  textColor: string
  dimColor: string   // para subline y "PATROCINADO"
}

const CHICAGO_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Escudo_del_Club_Atl%C3%A9tico_Nueva_Chicago.svg/500px-Escudo_del_Club_Atl%C3%A9tico_Nueva_Chicago.svg.png'
const CHICAGO_URL = 'https://canuevachicago.com.ar'

export const ADS: Ad[] = [
  {
    id: 'nueva-chicago-torito',
    logoEmoji: '⚽',
    logoText: 'NUEVA CHICAGO',
    logoUrl: CHICAGO_LOGO,
    headline: 'El Torito de Mataderos',
    subline: 'Club Atlético Nueva Chicago — ¡Arriba los verdinegros!',
    ctaText: 'CONOCÉ EL CLUB →',
    ctaUrl: CHICAGO_URL,
    bg: 'linear-gradient(100deg, #071A07 0%, #005C28 55%, #0A1A0A 100%)',
    ctaBg: '#FFFFFF',
    ctaColor: '#005020',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'nueva-chicago-socios',
    logoEmoji: '🏟️',
    logoText: 'NUEVA CHICAGO',
    logoUrl: CHICAGO_LOGO,
    headline: 'Hacete socio del Torito',
    subline: 'Entradas, descuentos y el orgullo de ser del barrio',
    ctaText: 'ASOCIARME →',
    ctaUrl: CHICAGO_URL,
    bg: 'linear-gradient(100deg, #002B10 0%, #006B30 60%, #003318 100%)',
    ctaBg: '#ffffff',
    ctaColor: '#003300',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'nueva-chicago-caballito',
    logoEmoji: '💚',
    logoText: 'NUEVA CHICAGO',
    logoUrl: CHICAGO_LOGO,
    headline: '100 años en el barrio',
    subline: 'Nueva Chicago, el club que nos representa a todos en Caballito',
    ctaText: 'VER FIXTURE →',
    ctaUrl: CHICAGO_URL,
    bg: 'linear-gradient(100deg, #0A0A0A 0%, #004020 50%, #1A3A1A 100%)',
    ctaBg: '#00A650',
    ctaColor: '#FFFFFF',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.5)',
  },
]

/** Devuelve el mismo ad durante toda la sesión (rotación por session). */
export function getSessionAd(): Ad {
  const KEY = 'prode_ad_session_idx'
  const stored = sessionStorage.getItem(KEY)
  if (stored !== null) return ADS[parseInt(stored, 10) % ADS.length]
  const idx = Math.floor(Math.random() * ADS.length)
  sessionStorage.setItem(KEY, String(idx))
  return ADS[idx]
}
