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

export const ADS: Ad[] = [
  {
    id: 'nueva-chicago-2026',
    logoEmoji: '⚽',
    logoText: 'NUEVA CHICAGO',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Escudo_del_Club_Atl%C3%A9tico_Nueva_Chicago.svg/500px-Escudo_del_Club_Atl%C3%A9tico_Nueva_Chicago.svg.png',
    headline: 'El Torito de Mataderos',
    subline: 'Club Atlético Nueva Chicago — ¡Arriba los verdinegros!',
    ctaText: 'CONOCÉ EL CLUB →',
    ctaUrl: 'https://canuevachicago.com.ar',
    bg: 'linear-gradient(100deg, #071A07 0%, #005C28 55%, #0A1A0A 100%)',
    ctaBg: '#FFFFFF',
    ctaColor: '#005020',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.5)',
  },
  {
    id: 'betsson-arg-2026',
    logoEmoji: '🎯',
    logoText: 'BETSSON',
    headline: 'Apostá al Mundial 2026',
    subline: 'Las mejores cuotas de Argentina',
    ctaText: 'APOSTAR →',
    ctaUrl: '#',
    bg: 'linear-gradient(100deg, #0D0D1A 0%, #1A1A3E 55%, #0F2460 100%)',
    ctaBg: '#E94560',
    ctaColor: '#FFFFFF',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.45)',
  },
  {
    id: 'mercadopago-2026',
    logoEmoji: '💳',
    logoText: 'MERCADO PAGO',
    headline: 'Pagá tu Prode fácil y rápido',
    subline: 'Sin costo adicional para vos',
    ctaText: 'VER CÓMO →',
    ctaUrl: '#',
    bg: 'linear-gradient(100deg, #0070D1 0%, #009EE3 100%)',
    ctaBg: '#FFFFFF',
    ctaColor: '#009EE3',
    textColor: '#FFFFFF',
    dimColor: 'rgba(255,255,255,0.55)',
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
