/**
 * AdCard — Banner nativo integrado en el feed de partidos / contenido.
 *
 * Se ve como una card del app pero claramente marcada como PATROCINADO.
 * Sin botón de cierre — el usuario hace scroll y la ve naturalmente.
 */
import { getSessionAd } from '@/config/ads'

export function AdCard() {
  const ad = getSessionAd()

  return (
    <a
      href={ad.ctaUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: 'block',
        background: ad.bg,
        borderRadius: 16,
        padding: '14px 16px',
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.06)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      {/* Chip PATROCINADO */}
      <span style={{
        position: 'absolute',
        top: 8, right: 12,
        fontSize: 8,
        fontWeight: 800,
        color: ad.dimColor,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        PATROCINADO
      </span>

      {/* Brillo de fondo decorativo */}
      <div style={{
        position: 'absolute',
        top: -30, right: -30,
        width: 120, height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)',
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginTop: 6,
      }}>

        {/* Logo */}
        <div style={{
          flexShrink: 0,
          width: 44, height: 44,
          borderRadius: 12,
          background: ad.logoUrl ? 'transparent' : 'rgba(255,255,255,0.14)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          overflow: 'hidden',
        }}>
          {ad.logoUrl ? (
            <img
              src={ad.logoUrl}
              alt={ad.logoText}
              style={{ width: 44, height: 44, objectFit: 'contain' }}
            />
          ) : (
            <>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{ad.logoEmoji}</span>
              <span style={{
                fontSize: 7, fontWeight: 900,
                color: ad.dimColor,
                letterSpacing: '0.04em',
              }}>
                {ad.logoText.split(' ')[0]}
              </span>
            </>
          )}
        </div>

        {/* Copy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 900,
            color: ad.textColor,
            lineHeight: 1.25,
            fontFamily: "'Arial Black', Arial, sans-serif",
          }}>
            {ad.headline}
          </p>
          {ad.subline && (
            <p style={{
              margin: '3px 0 0',
              fontSize: 11,
              color: ad.dimColor,
              lineHeight: 1.4,
            }}>
              {ad.subline}
            </p>
          )}
        </div>

        {/* CTA */}
        <div style={{
          flexShrink: 0,
          background: ad.ctaBg,
          color: ad.ctaColor,
          fontWeight: 900,
          fontSize: 11,
          padding: '9px 14px',
          borderRadius: 10,
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
          fontFamily: "'Arial Black', Arial, sans-serif",
        }}>
          {ad.ctaText}
        </div>

      </div>
    </a>
  )
}
