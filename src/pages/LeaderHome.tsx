import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { MatchCard } from '@/components/match/MatchCard'
import type { Match, Bet, Planilla, RankingEntry } from '@/types'

// Keyframes inyectados una vez
if (typeof document !== 'undefined' && !document.getElementById('leader-home-anim')) {
  const s = document.createElement('style')
  s.id = 'leader-home-anim'
  s.textContent = `
    @keyframes lh-crown {
      0%, 100% { transform: translateY(0px) rotate(-2deg) scale(1); }
      50%       { transform: translateY(-7px) rotate(2deg) scale(1.07); }
    }
    @keyframes lh-badge-pop {
      0%   { transform: scale(0.4); opacity: 0; }
      75%  { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes lh-fade-up {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes lh-glow-pulse {
      0%, 100% { box-shadow: 0 0 24px 4px rgba(245,197,0,0.15); }
      50%       { box-shadow: 0 0 48px 12px rgba(245,197,0,0.32); }
    }
    @keyframes lh-shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes lh-bar-slide {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
  `
  document.head.appendChild(s)
}

// ── Constantes visuales ──────────────────────────────────────────────────────
const GOLD        = '#F5C500'
const GOLD_DIM    = 'rgba(245,197,0,0.65)'
const GOLD_BORDER = 'rgba(245,197,0,0.22)'
const BG_DEEP     = '#030810'
const BG_CARD     = 'rgba(255,255,255,0.035)'
const BG_CARD2    = 'rgba(255,255,255,0.06)'
const BORDER_CARD = 'rgba(255,255,255,0.08)'
const TEXT_WHITE  = '#FFFFFF'
const TEXT_DIM    = 'rgba(255,255,255,0.55)'
const TEXT_MUTED  = 'rgba(255,255,255,0.28)'

// ── Helpers ──────────────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']

function Avatar({
  src, name, size, gold = false,
}: { src?: string; name: string; size: number; gold?: boolean }) {
  const fontSize = Math.round(size * 0.38)
  const border = gold ? `2.5px solid ${GOLD}` : `1px solid ${BORDER_CARD}`
  const bg     = gold ? GOLD : BG_CARD2
  const color  = gold ? BG_DEEP : TEXT_DIM

  return src ? (
    <img
      src={src} alt=""
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', flexShrink: 0, border,
        boxShadow: gold ? `0 0 14px rgba(245,197,0,0.4)` : 'none',
      }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, border, color, fontWeight: 900, fontSize,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: gold ? `0 0 14px rgba(245,197,0,0.4)` : 'none',
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface LeaderHomeProps {
  matches:      Match[]
  bets:         Record<string, Bet>
  onBetSaved:   (bet: Bet) => void
  onBetDeleted: (matchId: string) => void
  ranking:      RankingEntry[]
  myEntry:      RankingEntry
  planilla:     Planilla | null
  totalUnbet:   number
  urgentUnbet:  number
}

// ── Componente principal ─────────────────────────────────────────────────────
export function LeaderHome({
  matches, bets, onBetSaved, onBetDeleted,
  ranking, myEntry, planilla,
  totalUnbet, urgentUnbet,
}: LeaderHomeProps) {
  const { user } = useAuthStore()
  const [shared, setShared] = useState(false)

  const firstName  = user?.nombre?.split(' ')[0] || 'Campeón'
  const second     = ranking[1]
  const lead       = second ? myEntry.puntos_totales - second.puntos_totales : null
  const top5       = ranking.slice(0, 5)
  const upcomingAll = matches
    .filter(m => m.estado !== 'finished')
    .slice(0, 4)

  const handleShare = async () => {
    const text =
      `Voy primero en el PRODE Caballito con ${myEntry.puntos_totales} puntos 🏆\n` +
      `¿Me venís a buscar?\nprodecaballito.com/ranking`
    if (navigator.share) {
      await navigator.share({ title: 'PRODE Caballito', text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: BG_DEEP, minHeight: '100vh' }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(160deg, #0C1645 0%, #060D28 45%, #030810 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingBottom: 56,
      }}>
        {/* Radial gold glow desde arriba */}
        <div style={{
          position: 'absolute', top: -80, left: '50%',
          transform: 'translateX(-50%)',
          width: 500, height: 360,
          background: 'radial-gradient(ellipse at center, rgba(245,197,0,0.18) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />

        {/* Textura estadio sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=50')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.035, pointerEvents: 'none',
        }} />

        {/* Líneas de velocidad decorativas */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            repeating-linear-gradient(
              105deg,
              transparent 0px,
              transparent 120px,
              rgba(245,197,0,0.025) 120px,
              rgba(245,197,0,0.025) 122px
            )
          `,
        }} />

        <div style={{ maxWidth: 896, margin: '0 auto', padding: '44px 20px 0', position: 'relative' }}>

          {/* Corona animada */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 58,
              lineHeight: 1,
              animation: 'lh-crown 3.2s ease-in-out infinite',
              filter: 'drop-shadow(0 0 20px rgba(245,197,0,0.7)) drop-shadow(0 0 40px rgba(245,197,0,0.3))',
            }}>
              👑
            </span>
          </div>

          {/* Badge #1 */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `linear-gradient(90deg, #F5C500 0%, #FFDF00 50%, #F5C500 100%)`,
              backgroundSize: '200% auto',
              animation: 'lh-badge-pop 0.55s cubic-bezier(0.175,0.885,0.32,1.275) both, lh-shimmer 3s linear 0.6s infinite',
              borderRadius: 99,
              padding: '7px 22px',
              boxShadow: `0 0 28px rgba(245,197,0,0.5)`,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 900,
                color: BG_DEEP, letterSpacing: '0.15em',
                fontFamily: "'Arial Black', Arial, sans-serif",
              }}>
                # 1 &nbsp;·&nbsp; LÍDER ABSOLUTO
              </span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{
              fontSize: 'clamp(36px, 9vw, 62px)',
              fontWeight: 900,
              fontFamily: "'Arial Black', Arial, sans-serif",
              letterSpacing: '-0.025em',
              lineHeight: 0.92,
              animation: 'lh-fade-up 0.6s ease-out 0.1s both',
            }}>
              <span style={{ color: TEXT_WHITE, display: 'block' }}>LA PUNTA</span>
              <span style={{
                color: GOLD,
                display: 'block',
                filter: 'drop-shadow(0 0 24px rgba(245,197,0,0.5))',
              }}>
                ES TUYA
              </span>
            </div>
          </div>

          {/* Sub: nombre + puntos + ventaja */}
          <p style={{
            textAlign: 'center',
            margin: '16px 0 0',
            fontSize: 13,
            fontWeight: 700,
            color: TEXT_DIM,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            animation: 'lh-fade-up 0.6s ease-out 0.2s both',
          }}>
            {firstName}
            <span style={{ color: GOLD_DIM, margin: '0 10px' }}>·</span>
            {myEntry.puntos_totales} pts
            {lead !== null && lead > 0 && (
              <>
                <span style={{ color: GOLD_DIM, margin: '0 10px' }}>·</span>
                <span style={{ color: GOLD }}>+{lead} sobre el 2°</span>
              </>
            )}
          </p>

          {/* CTAs */}
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center', gap: 12, marginTop: 28,
            animation: 'lh-fade-up 0.6s ease-out 0.3s both',
          }}>
            {totalUnbet > 0 ? (
              <Link
                to="/apuestas"
                style={{
                  background: urgentUnbet > 0
                    ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                    : `linear-gradient(135deg, #F5C500 0%, #FFDF00 100%)`,
                  color: urgentUnbet > 0 ? TEXT_WHITE : BG_DEEP,
                  fontWeight: 900,
                  fontSize: 14,
                  padding: '14px 28px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  display: 'inline-block',
                  boxShadow: urgentUnbet > 0
                    ? '0 6px 24px rgba(239,68,68,0.4)'
                    : '0 6px 32px rgba(245,197,0,0.45)',
                  fontFamily: "'Arial Black', Arial, sans-serif",
                  letterSpacing: '-0.01em',
                }}
              >
                {urgentUnbet > 0
                  ? `${urgentUnbet} urgente${urgentUnbet > 1 ? 's' : ''} — Apostar ya`
                  : `Defender el #1 — ${totalUnbet} pendiente${totalUnbet > 1 ? 's' : ''}`}
              </Link>
            ) : (
              <Link
                to="/ranking"
                style={{
                  background: 'linear-gradient(135deg, #F5C500 0%, #FFDF00 100%)',
                  color: BG_DEEP,
                  fontWeight: 900,
                  fontSize: 14,
                  padding: '14px 28px',
                  borderRadius: 14,
                  textDecoration: 'none',
                  display: 'inline-block',
                  boxShadow: '0 6px 32px rgba(245,197,0,0.45)',
                  fontFamily: "'Arial Black', Arial, sans-serif",
                }}
              >
                Ver ranking completo →
              </Link>
            )}

            <button
              onClick={handleShare}
              style={{
                background: BG_CARD,
                border: `1px solid ${GOLD_BORDER}`,
                color: shared ? GOLD : TEXT_DIM,
                fontWeight: 700,
                fontSize: 13,
                padding: '14px 22px',
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'color 0.2s, background 0.2s',
              }}
            >
              {shared ? '✓ Copiado' : '↗ Compartir'}
            </button>
          </div>

        </div>{/* /container */}

        {/* Degradado de salida al fondo oscuro */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
          background: `linear-gradient(to bottom, transparent, ${BG_DEEP})`,
          pointerEvents: 'none',
        }} />
      </div>{/* /hero */}

      {/* ══ CONTENIDO ══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* ── STATUS STATS ─────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginTop: -28,
          position: 'relative',
          zIndex: 2,
        }}>
          {[
            { label: 'POSICIÓN', value: '#1', highlight: true },
            { label: 'PUNTOS',   value: String(myEntry.puntos_totales), highlight: false },
            {
              label: 'VENTAJA',
              value: lead !== null && lead > 0 ? `+${lead}` : '—',
              highlight: false,
            },
            { label: 'EXACTOS',  value: String(myEntry.exactos_count), highlight: false },
          ].map(({ label, value, highlight }, idx) => (
            <div
              key={label}
              style={{
                background: highlight
                  ? `linear-gradient(145deg, #F5C500 0%, #D4A800 100%)`
                  : BG_CARD,
                border: `1px solid ${highlight ? 'transparent' : GOLD_BORDER}`,
                borderRadius: 14,
                padding: '16px 6px 12px',
                textAlign: 'center',
                animation: highlight
                  ? `lh-fade-up 0.5s ease-out ${0.05 * idx}s both, lh-glow-pulse 2.5s ease-in-out 0.5s infinite`
                  : `lh-fade-up 0.5s ease-out ${0.05 * idx}s both`,
                boxShadow: highlight ? '0 0 32px rgba(245,197,0,0.35)' : 'none',
              }}
            >
              <p style={{
                margin: 0,
                fontSize: 'clamp(20px, 4.5vw, 30px)',
                fontWeight: 900,
                color: highlight ? BG_DEEP : TEXT_WHITE,
                fontFamily: "'Arial Black', Arial, sans-serif",
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {value}
              </p>
              <p style={{
                margin: '5px 0 0',
                fontSize: 8,
                fontWeight: 800,
                color: highlight ? 'rgba(3,8,16,0.5)' : TEXT_MUTED,
                letterSpacing: '0.1em',
              }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── BANNER EMOCIONAL ─────────────────────────────────────────── */}
        <div style={{
          marginTop: 20,
          background: `linear-gradient(135deg, rgba(245,197,0,0.07) 0%, rgba(245,197,0,0.02) 100%)`,
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 18,
          padding: '20px 22px 22px',
          position: 'relative',
          overflow: 'hidden',
          animation: 'lh-fade-up 0.55s ease-out 0.2s both',
        }}>
          {/* Línea dorada superior */}
          <div style={{
            position: 'absolute', top: 0, left: 24, right: 24,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }} />

          {/* Glow corner */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 120, height: 120,
            background: `radial-gradient(circle, rgba(245,197,0,0.1) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>🏆</div>
            <div>
              <p style={{
                margin: '0 0 8px',
                fontSize: 10,
                fontWeight: 900,
                color: GOLD,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>
                Desde ProdeCaballito
              </p>
              <p style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.92)',
                lineHeight: 1.55,
              }}>
                Te queremos premiar y tratarte como te merecés.
              </p>
              <p style={{
                margin: '7px 0 0',
                fontSize: 13,
                color: TEXT_DIM,
                lineHeight: 1.6,
              }}>
                Esta home existe porque vas primero. Es exclusiva para vos — y no para cualquiera.
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA PRONÓSTICOS ─────────────────────────────────────────── */}
        {totalUnbet > 0 && (
          <Link
            to="/apuestas"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              marginTop: 16,
              background: urgentUnbet > 0
                ? 'linear-gradient(135deg, #1A0000 0%, #2D0505 100%)'
                : `linear-gradient(135deg, rgba(245,197,0,0.10) 0%, rgba(245,197,0,0.03) 100%)`,
              border: `1px solid ${urgentUnbet > 0 ? 'rgba(239,68,68,0.35)' : GOLD_BORDER}`,
              borderRadius: 18,
              padding: '18px 20px',
              textDecoration: 'none',
              transition: 'filter 0.15s',
              animation: 'lh-fade-up 0.55s ease-out 0.25s both',
            }}
          >
            <div>
              <p style={{
                margin: '0 0 4px',
                fontSize: 12,
                fontWeight: 900,
                color: urgentUnbet > 0 ? '#fca5a5' : GOLD,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {urgentUnbet > 0 ? '⚠️ Pronósticos urgentes' : 'No aflojés — defendé la punta'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_DIM }}>
                {urgentUnbet > 0
                  ? `${urgentUnbet} partido${urgentUnbet > 1 ? 's cierran' : ' cierra'} pronto sin tu apuesta`
                  : `Completá ${totalUnbet} pronóstico${totalUnbet > 1 ? 's' : ''} y mantenete arriba`
                }
              </p>
            </div>
            <span style={{
              background: urgentUnbet > 0 ? '#ef4444' : GOLD,
              color: urgentUnbet > 0 ? TEXT_WHITE : BG_DEEP,
              fontWeight: 900,
              fontSize: 12,
              padding: '11px 18px',
              borderRadius: 11,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: "'Arial Black', Arial, sans-serif",
              letterSpacing: '-0.01em',
            }}>
              {urgentUnbet > 0 ? 'Apostar →' : 'Completar →'}
            </span>
          </Link>
        )}

        {/* ── RANKING PREMIUM ─────────────────────────────────────────── */}
        {top5.length > 0 && (
          <div style={{
            marginTop: 20,
            background: BG_CARD,
            border: `1px solid ${BORDER_CARD}`,
            borderRadius: 18,
            overflow: 'hidden',
            animation: 'lh-fade-up 0.55s ease-out 0.3s both',
          }}>
            {/* Header */}
            <div style={{
              background: 'rgba(255,255,255,0.025)',
              borderBottom: `1px solid ${GOLD_BORDER}`,
              padding: '13px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 900,
                color: GOLD, letterSpacing: '0.1em',
              }}>
                🏆 RANKING — VOS VAN PRIMERO
              </span>
              <Link to="/ranking" style={{
                fontSize: 11, color: TEXT_MUTED, textDecoration: 'none',
                fontWeight: 600,
              }}>
                Ver completo →
              </Link>
            </div>

            {top5.map((r, i) => {
              const isMe = r.user_id === user?.id
              return (
                <div
                  key={r.planilla_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: isMe ? '16px 18px' : '12px 18px',
                    background: isMe
                      ? `linear-gradient(90deg, rgba(245,197,0,0.10) 0%, rgba(245,197,0,0.02) 100%)`
                      : 'transparent',
                    borderBottom: i < top5.length - 1
                      ? `1px solid rgba(255,255,255,0.04)`
                      : 'none',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Barra dorada lateral para el líder */}
                  {isMe && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: 3, background: GOLD, borderRadius: '0 2px 2px 0',
                      animation: 'lh-glow-pulse 2s ease-in-out infinite',
                    }} />
                  )}

                  {/* Posición / medalla */}
                  <span style={{
                    fontSize: i < 3 ? 18 : 12,
                    fontWeight: i >= 3 ? 700 : undefined,
                    color: i >= 3 ? TEXT_MUTED : undefined,
                    width: 28, textAlign: 'center', flexShrink: 0,
                  }}>
                    {i < 3 ? MEDALS[i] : r.position}
                  </span>

                  {/* Avatar */}
                  <Avatar
                    src={r.user_avatar}
                    name={r.user_name}
                    size={isMe ? 42 : 34}
                    gold={isMe}
                  />

                  {/* Nombre */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: isMe ? 14 : 13,
                      fontWeight: isMe ? 900 : 600,
                      color: isMe ? TEXT_WHITE : TEXT_DIM,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {r.user_name.split(' ')[0]}
                      {isMe && (
                        <span style={{
                          marginLeft: 8, fontSize: 10,
                          color: GOLD, fontWeight: 700,
                        }}>
                          — VOS
                        </span>
                      )}
                    </p>
                    {isMe && lead !== null && lead > 0 && (
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: GOLD_DIM }}>
                        +{lead}pts sobre el 2° puesto
                      </p>
                    )}
                  </div>

                  {/* Puntos */}
                  <p style={{
                    margin: 0,
                    fontSize: isMe ? 20 : 14,
                    fontWeight: 900,
                    color: isMe ? GOLD : TEXT_DIM,
                    fontFamily: "'Arial Black', Arial, sans-serif",
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                    filter: isMe ? 'drop-shadow(0 0 8px rgba(245,197,0,0.5))' : 'none',
                  }}>
                    {r.puntos_totales}
                    <span style={{
                      fontSize: 9, fontWeight: 500,
                      color: TEXT_MUTED, marginLeft: 2,
                    }}>
                      pts
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PRÓXIMOS PARTIDOS ────────────────────────────────────────── */}
        {upcomingAll.length > 0 && (
          <div style={{
            marginTop: 28,
            animation: 'lh-fade-up 0.55s ease-out 0.35s both',
          }}>
            {/* Título con acento dorado */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            }}>
              <div style={{
                width: 3, height: 20,
                background: `linear-gradient(to bottom, ${GOLD}, ${GOLD_DIM})`,
                borderRadius: 2, flexShrink: 0,
              }} />
              <p style={{
                margin: 0,
                fontSize: 11, fontWeight: 900,
                color: GOLD, letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Se viene tu próxima defensa
              </p>
            </div>

            <p style={{
              margin: '-8px 0 14px 13px',
              fontSize: 12,
              color: TEXT_MUTED,
            }}>
              Cada partido es una oportunidad de estirar la ventaja.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingAll.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  bet={bets[m.id]}
                  planillaId={planilla?.id}
                  onBetSaved={onBetSaved}
                  onBetDeleted={onBetDeleted}
                />
              ))}
            </div>

            <Link
              to="/apuestas"
              style={{
                display: 'block', textAlign: 'center',
                marginTop: 14, fontSize: 12, color: TEXT_MUTED,
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              Ver todos los partidos →
            </Link>
          </div>
        )}

        {/* ── COMPARTIR ────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 28,
          background: `linear-gradient(135deg, rgba(245,197,0,0.07) 0%, rgba(245,197,0,0.02) 100%)`,
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 20,
          padding: '28px 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'lh-fade-up 0.55s ease-out 0.4s both',
        }}>
          {/* Glow de fondo */}
          <div style={{
            position: 'absolute', bottom: -40, left: '50%',
            transform: 'translateX(-50%)',
            width: 200, height: 120,
            background: 'radial-gradient(ellipse, rgba(245,197,0,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <span style={{ fontSize: 36, lineHeight: 1, display: 'block', marginBottom: 10 }}>
            🏆
          </span>
          <p style={{
            margin: '0 0 6px',
            fontSize: 16, fontWeight: 900,
            color: TEXT_WHITE,
          }}>
            Hacelo saber
          </p>
          <p style={{
            margin: '0 0 20px',
            fontSize: 13, color: TEXT_DIM, lineHeight: 1.6,
          }}>
            Deciles que van primero.<br />
            Que te vengan a buscar.
          </p>
          <button
            onClick={handleShare}
            style={{
              background: shared
                ? 'rgba(74,222,128,0.15)'
                : `linear-gradient(135deg, #F5C500 0%, #FFDF00 100%)`,
              color: shared ? '#4ade80' : BG_DEEP,
              fontWeight: 900,
              fontSize: 14,
              padding: '14px 32px',
              borderRadius: 14,
              border: shared ? '1px solid rgba(74,222,128,0.3)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: shared ? 'none' : '0 6px 28px rgba(245,197,0,0.4)',
              fontFamily: "'Arial Black', Arial, sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            {shared ? '✓ Link copiado' : 'Compartir que voy primero →'}
          </button>
        </div>

      </div>{/* /content */}
    </div>
  )
}
