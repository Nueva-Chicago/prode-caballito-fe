/**
 * AdBanner — Sponsor Strip horizontal en la parte superior del contenido.
 *
 * Aparece en todas las páginas autenticadas (incluido desde AppLayout).
 * Se descarta por sesión (sessionStorage). Anima entrada y salida.
 */
import { useState } from 'react'
import { getSessionAd } from '@/config/ads'

const DISMISS_KEY = 'prode_banner_dismissed'

export function AdBanner() {
  const ad = getSessionAd()
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) !== '1'
  )
  const [closing, setClosing] = useState(false)

  if (!visible) return null

  const handleDismiss = () => {
    setClosing(true)
    setTimeout(() => {
      sessionStorage.setItem(DISMISS_KEY, '1')
      setVisible(false)
    }, 280)
  }

  return (
    <div
      style={{
        background: ad.bg,
        width: '100%',
        overflow: 'hidden',
        maxHeight: closing ? 0 : 56,
        opacity: closing ? 0 : 1,
        transition: 'max-height 0.28s ease, opacity 0.22s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        height: 56,
        maxWidth: 896,
        margin: '0 auto',
        position: 'relative',
      }}>

        {/* Chip PATROCINADO */}
        <span style={{
          position: 'absolute',
          top: 5, left: 12,
          fontSize: 7,
          fontWeight: 800,
          color: ad.dimColor,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          PATROCINADO
        </span>

        {/* Logo */}
        <div style={{
          flexShrink: 0,
          width: 36, height: 36,
          borderRadius: 10,
          background: ad.logoUrl ? 'transparent' : 'rgba(255,255,255,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          marginTop: 8,
          overflow: 'hidden',
        }}>
          {ad.logoUrl ? (
            <img
              src={ad.logoUrl}
              alt={ad.logoText}
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
          ) : (
            <>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{ad.logoEmoji}</span>
              <span style={{
                fontSize: 6, fontWeight: 900,
                color: ad.dimColor, letterSpacing: '0.04em',
              }}>
                {ad.logoText.split(' ')[0]}
              </span>
            </>
          )}
        </div>

        {/* Copy */}
        <div style={{ flex: 1, minWidth: 0, marginTop: 8 }}>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 800,
            color: ad.textColor,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}>
            {ad.headline}
          </p>
          {ad.subline && (
            <p style={{
              margin: 0,
              fontSize: 10,
              color: ad.dimColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {ad.subline}
            </p>
          )}
        </div>

        {/* CTA */}
        <a
          href={ad.ctaUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          style={{
            flexShrink: 0,
            background: ad.ctaBg,
            color: ad.ctaColor,
            fontWeight: 900,
            fontSize: 11,
            padding: '7px 13px',
            borderRadius: 9,
            textDecoration: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            marginTop: 8,
            fontFamily: "'Arial Black', Arial, sans-serif",
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {ad.ctaText}
        </a>

        {/* Cerrar */}
        <button
          onClick={handleDismiss}
          aria-label="Cerrar publicidad"
          style={{
            flexShrink: 0,
            width: 24, height: 24,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ad.dimColor,
            fontSize: 14,
            lineHeight: 1,
            marginTop: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
        >
          ×
        </button>

      </div>
    </div>
  )
}
