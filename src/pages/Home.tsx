import { useEffect, useState, useRef, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { MatchCard } from '@/components/match/MatchCard'
import { Sk, SkMatchCard } from '@/components/ui/Skeleton'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { teamFlag } from '@/utils/teamFlags'
import { TEAM_THEMES } from '@/types'
import type { Match, Bet, Planilla, RankingEntry } from '@/types'

/* ── Flip clock display ──────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('flip-anim')) {
  const s = document.createElement('style')
  s.id = 'flip-anim'
  s.textContent = `
    @keyframes flipDown {
      from { transform: perspective(280px) rotateX(-82deg); }
      to   { transform: perspective(280px) rotateX(0deg); }
    }
  `
  document.head.appendChild(s)
}

// Card dimensions
const FW = 34, FH = 50, FFS = 38

function FlipDigit({ digit, animate = false }: { digit: string; animate?: boolean }) {
  const halfH = FH / 2
  // Digit sits centered in full card height; clip each half
  const topOffset  = (FH - FFS) / 2          // top of digit from card top  (= 6px)
  const botOffset  = topOffset - halfH         // top of digit from bot-half top (= -19px)
  const numStyle: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0,
    textAlign: 'center',
    fontSize: FFS, fontWeight: 900, color: '#FFFFFF',
    lineHeight: 1, userSelect: 'none',
    fontFamily: "'Arial Black', Arial, sans-serif",
    letterSpacing: -1,
  }
  return (
    <div style={{ position: 'relative', width: FW, height: FH, borderRadius: 5, overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset' }}>

      {/* Top half */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: halfH,
        background: '#242428', overflow: 'hidden' }}>
        <span style={{ ...numStyle, top: topOffset }}>{digit}</span>
      </div>

      {/* Bottom half */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: halfH,
        background: '#1a1a1c', overflow: 'hidden' }}>
        <span style={{ ...numStyle, top: botOffset }}>{digit}</span>
      </div>

      {/* Divider */}
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0,
        height: 1.5, background: 'rgba(0,0,0,0.85)', zIndex: 10,
        transform: 'translateY(-50%)' }} />

      {/* Flip flap — overlays top half and falls into place on mount */}
      {animate && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: halfH,
          background: '#242428', overflow: 'hidden', zIndex: 5,
          transformOrigin: '50% 100%',
          animation: 'flipDown 0.28s ease-in',
          boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>
          <span style={{ ...numStyle, top: topOffset }}>{digit}</span>
        </div>
      )}
    </div>
  )
}

function FlipDisplay({ value }: { value: string }) {
  const groups = value.split(':')
  const labels = groups.length === 4 ? ['DÍAS', 'HS', 'MIN', 'SEG'] : ['HS', 'MIN', 'SEG']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      {groups.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
              gap: 7, height: FH, paddingBottom: 16 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {group.split('').map((ch, di) => (
                <FlipDigit
                  key={`${gi}-${di}-${ch}`}
                  digit={ch}
                  animate={gi === groups.length - 1}
                />
              ))}
            </div>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {labels[gi]}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function pad2(n: number) { return String(n).padStart(2, '0') }

/* ── Countdown al Mundial ────────────────────────────────────────── */
const MUNDIAL_START = new Date('2026-06-11T19:00:00Z') // México vs Sudáfrica

function getMundialCountdown() {
  const diff = MUNDIAL_START.getTime() - Date.now()
  if (diff <= 0) return null
  const totalSecs = Math.floor(diff / 1000)
  return {
    days:  Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins:  Math.floor((totalSecs % 3600) / 60),
    secs:  totalSecs % 60,
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-3xl md:text-5xl font-black tabular-nums rounded-xl px-3 py-2 min-w-[62px] md:min-w-[80px] text-center leading-none"
        style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--theme-secondary)', fontFamily: "'Arial Black', Arial, sans-serif" }}
      >
        {pad2(value)}
      </div>
      <span className="text-[9px] font-black text-white/50 tracking-widest uppercase">{label}</span>
    </div>
  )
}

function HeroBadge({ tema, theme }: { tema: string; theme: { name: string; pattern?: string; badgeUrl?: string } }) {
  const [imgError, setImgError] = useState(false)
  const showImg = !!theme.badgeUrl && !imgError
  return (
    <div
      className="w-28 h-28 md:w-44 md:h-44 rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl overflow-hidden shrink-0"
      style={{ background: showImg ? 'rgba(255,255,255,0.10)' : (theme.pattern || 'var(--theme-primary)') }}
    >
      {showImg
        ? <img
            src={theme.badgeUrl}
            alt={theme.name}
            className="w-20 h-20 md:w-36 md:h-36 object-contain drop-shadow-xl"
            onError={() => setImgError(true)}
          />
        : tema === 'neutral'
          ? <span style={{ fontSize: 56, lineHeight: 1 }}>🇦🇷</span>
          : <span
              className="text-5xl md:text-7xl font-black text-white drop-shadow"
              style={{ fontFamily: "'Arial Black', Arial, sans-serif", textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            >
              {theme.name.split(' ')[0][0]}
            </span>
      }
    </div>
  )
}

function NextMatchBanner({ matches, bets, embedded = false }: { matches: Match[]; bets: Record<string, Bet>; embedded?: boolean }) {
  const [now, setNow] = useState(Date.now())
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ref.current = setInterval(() => setNow(Date.now()), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [])

  // Recalcula el próximo partido en cada tick (auto-switch cuando empieza)
  const match = matches
    .filter(m => m.estado !== 'finished' && new Date(m.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null

  if (!match) return null

  const hasBet = !!bets[match.id]

  const startMs = new Date(match.start_time).getTime()
  const diff = Math.max(0, startMs - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m2 = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  const displayStr = d > 0
    ? `${pad2(d)}:${pad2(h)}:${pad2(m2)}:${pad2(s)}`
    : `${pad2(h)}:${pad2(m2)}:${pad2(s)}`
  const dateStr = format(new Date(match.start_time), "EEE d MMM · HH:mm", { locale: esLocale })

  const content = (
    <>
      {/* Match info */}
      <div style={{ marginBottom: 14 }}>
        {/* Row 1: labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ⚡ Próximo partido
          </p>
          {hasBet && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: -4 }}>Tu apuesta</span>
          )}
        </div>
        {/* Row 2: team names + bet pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
            {match.home_team} <span style={{ color: 'rgba(255,255,255,0.45)' }}>vs</span> {match.away_team}
          </p>
          {hasBet && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 8, padding: '3px 8px',
              fontSize: 12, fontWeight: 900, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>✓</span>
              <span>{teamFlag(match.home_team) || '🏳'}</span>
              <span style={{ color: '#4ade80' }}>{bets[match.id].goles_local}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>–</span>
              <span style={{ color: '#4ade80' }}>{bets[match.id].goles_visitante}</span>
              <span>{teamFlag(match.away_team) || '🏳'}</span>
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          📅 {dateStr} hs
        </p>
        {!hasBet && (
          <Link to="/apuestas" style={{
            display: 'inline-block', marginTop: 8,
            background: '#FFCC00', color: '#001A4B',
            fontSize: 11, fontWeight: 800, padding: '4px 12px',
            borderRadius: 20, textDecoration: 'none',
          }}>
            🎯 Apostar →
          </Link>
        )}
      </div>

      {/* Flip clock centered */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FlipDisplay value={displayStr} />
      </div>
    </>
  )

  if (embedded) return content

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #001A4B 60%, #0a2060 100%)',
      borderRadius: 16,
      padding: '16px 20px 18px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {content}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Hero */}
      <div className="t-gradient-hero rounded-2xl p-5 text-white" style={{ minHeight: 180 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            <div className="animate-pulse bg-green-400/30 h-3 w-36 rounded-full" />
            <div className="space-y-1.5">
              <div className="animate-pulse bg-white/40 h-5 w-40 rounded" />
              <div className="animate-pulse bg-white/35 h-5 w-36 rounded" />
              <div className="animate-pulse bg-white/30 h-5 w-44 rounded" />
            </div>
            <div className="animate-pulse bg-white/30 h-8 w-40 rounded-lg" />
          </div>
          <div className="shrink-0 flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {[0,1,2,3].map(i => <div key={i} className="animate-pulse bg-white/20 rounded-lg w-10 h-12" />)}
            </div>
            <div className="animate-pulse bg-white/20 rounded-full w-16 h-16" />
          </div>
        </div>
      </div>
      {/* Quick access */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col items-center gap-2">
            <Sk className="w-8 h-8 rounded-full" />
            <Sk className="h-3 w-14" />
            <Sk className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
      {/* Podio */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Sk className="h-9 rounded-none" />
        <div className="flex items-end justify-center gap-1 px-6 pt-6 pb-4">
          {[{ h: 'h-6', sz: 'w-10 h-10' }, { h: 'h-10', sz: 'w-14 h-14' }, { h: 'h-4', sz: 'w-10 h-10' }].map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`animate-pulse bg-gray-200 rounded-full ${p.sz}`} />
              <Sk className="h-3 w-14" />
              <Sk className="h-3 w-10" />
              <Sk className={`w-full rounded-t-lg ${p.h}`} />
            </div>
          ))}
        </div>
      </div>
      {/* Partidos */}
      <div className="space-y-3">
        <Sk className="h-4 w-28" />
        {[0, 1, 2].map(i => <SkMatchCard key={i} />)}
      </div>
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']
// Orden visual del podio: 2do (izq), 1ro (centro), 3ro (der)
const PODIUM_ORDER = [1, 0, 2]


export function Home() {
  const { user } = useAuthStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const { state: pwaState, install: pwaInstall } = usePWAInstall()
  const [mundialCd, setMundialCd] = useState(getMundialCountdown)

  // Tema del equipo elegido por el usuario
  const tema = user?.tema_equipo || 'neutral'
  const theme = TEAM_THEMES[tema] || TEAM_THEMES.neutral

  // Reloj para el countdown (cada minuto)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Countdown al Mundial (cada segundo)
  useEffect(() => {
    const id = setInterval(() => setMundialCd(getMundialCountdown()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { loadData() }, [])

  // Polling cada 30s para refrescar resultados automáticamente
  useEffect(() => {
    const interval = setInterval(() => loadData(), 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [matchRes, planillaRes, rankRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/ranking?limit=50'),
        api.get('/tournaments').catch(() => ({ data: { data: [] } })),
      ])
      setMatches(matchRes.data.data.matches)
      setRanking(rankRes.data.data.ranking)

      const planillas: Planilla[] = planillaRes.data.data
      if (planillas.length > 0) {
        const p = planillas[0]
        setPlanilla(p)
        const betRes = await api.get(`/bets/planillas/${p.id}/bets?t=${Date.now()}`)
        const betMap: Record<string, Bet> = {}
        for (const b of betRes.data.data) betMap[b.match_id] = b
        setBets(betMap)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const refreshBets = async () => {
    if (!planilla) return
    const betRes = await api.get(`/bets/planillas/${planilla.id}/bets?t=${Date.now()}`)
    const betMap: Record<string, Bet> = {}
    for (const b of betRes.data.data) betMap[b.match_id] = b
    setBets(betMap)
  }

  const pendingMatches = matches.filter(m => m.estado !== 'finished')
  const finishedMatches = matches.filter(m => m.estado === 'finished')

  const totalUnbet = matches
    .filter(m => m.estado !== 'finished' && !bets[m.id])
    .length

  const closingSoon = matches
    .filter(m => {
      if (m.estado !== 'pending') return false
      const diff = new Date(m.time_cutoff).getTime() - now.getTime()
      return diff > 0 && diff < 6 * 3600000
    })
    .sort((a, b) => new Date(a.time_cutoff).getTime() - new Date(b.time_cutoff).getTime())
    .slice(0, 2)

  const upcoming = pendingMatches.slice(0, 5)
  const recentFinished = finishedMatches.slice(0, 3)

  const urgentUnbet = closingSoon.filter(m => !bets[m.id]).length

  const myEntry = ranking.find(r => r.user_id === user?.id)
  const leader = ranking[0]
  const ptsDiff = leader && myEntry ? leader.puntos_totales - myEntry.puntos_totales : null
  const top3 = ranking.slice(0, 3)


  if (loading) return <HomeSkeleton />

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* ── 1+2. HERO + PRÓXIMO PARTIDO ─────────────────────────── */}
      {/* Mobile: edge-to-edge (-mx-4 cancela el px-4 del padre)     */}
      {/* Desktop: side by side, rounded, shadow                      */}
      <div className="-mx-4 md:mx-0 md:flex md:rounded-2xl md:overflow-hidden md:shadow-2xl">

      {/* Hero */}
      <div
        className="text-white overflow-hidden relative md:flex-[3]"
        style={{
          background: `linear-gradient(135deg, var(--theme-nav-bg) 0%, var(--theme-primary) 65%, var(--theme-nav-bg) 100%)`,
          minHeight: 240,
        }}
      >
        {/* Jersey pattern overlay */}
        {theme.pattern && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: theme.pattern, opacity: 0.07 }}
          />
        )}

        <div className="relative px-5 py-5 flex items-center gap-4 md:gap-8">
          {/* Left: headline + CTA */}
          <div className="flex-1 min-w-0">
            {/* Badge PRONÓSTICOS EXCLUSIVOS */}
            <div className="inline-flex items-center gap-1.5 border border-green-500/40 bg-green-500/15 text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full mb-2.5 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shrink-0" />
              Pronósticos exclusivos
            </div>

            <h1 className="font-black text-white leading-tight mb-2.5"
              style={{ fontSize: 'clamp(17px, 4.5vw, 26px)', lineHeight: 1.15, fontFamily: "'Arial Black', Arial, sans-serif" }}>
              EL MUNDIAL<br />SE JUEGA<br />ACÁ TAMBIÉN
            </h1>

            <p className="text-white/55 text-[11px] mb-3 leading-snug hidden sm:block">
              Arrancá, apostá y competí con tus amigos.<br />El Mundial 2026 te espera.
            </p>

            <Link
              to="/apuestas"
              className="inline-flex items-center gap-1.5 font-black text-xs px-4 py-2 rounded-lg transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'var(--theme-secondary)', color: 'var(--theme-accent-text)' }}
            >
              EMPIEZA TU PRODE ⚽
            </Link>

            <p className="text-white/30 text-[9px] tracking-widest mt-2 uppercase hidden sm:block">
              Jueves, 11 de Junio 2026
            </p>

            {pwaState.type !== 'installed' && pwaState.type !== 'unavailable' && (
              <button
                onClick={() => pwaState.type === 'ios' ? setShowIOSGuide(true) : pwaInstall()}
                className="block text-white/25 text-[9px] mt-1 hover:text-white/50 transition-colors"
              >
                📲 {t.home.installApp}
              </button>
            )}
          </div>

          {/* Right: countdown + decoration */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            {/* Countdown */}
            {mundialCd ? (
              <div className="flex items-end gap-1">
                <CountdownUnit value={mundialCd.days}  label="días" />
                <span className="text-white/30 font-black pb-4 text-lg">:</span>
                <CountdownUnit value={mundialCd.hours} label="hs" />
                <span className="text-white/30 font-black pb-4 text-lg">:</span>
                <CountdownUnit value={mundialCd.mins}  label="min" />
                <span className="text-white/30 font-black pb-4 text-lg">:</span>
                <CountdownUnit value={mundialCd.secs}  label="seg" />
              </div>
            ) : (
              <span className="text-white/60 text-sm font-bold">¡Empezó! 🎉</span>
            )}

            {/* Circle decoration — escudo del club o fallback */}
            <HeroBadge tema={tema} theme={theme} />
          </div>
        </div>
      </div>

      {/* Próximo partido — panel derecho (desktop only, embedded en el mismo block) */}
      <div
        className="hidden md:flex flex-col justify-center px-6 py-5 md:flex-[2] border-l border-white/10"
        style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #001A4B 60%, #0a2060 100%)' }}
      >
        <NextMatchBanner matches={matches} bets={bets} embedded />
      </div>

      </div>{/* fin md:flex wrapper */}

      {/* Modal guía iOS */}
      {showIOSGuide && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowIOSGuide(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <h3 className="font-bold text-[#001A4B] text-base mb-1">📲 {t.home.installApp}</h3>
            <p className="text-xs text-gray-400 mb-5">{t.home.iosInstallDesc}</p>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0042A5] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep1Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep1Desc}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0042A5] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep2Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep2Desc}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FFDF00] text-[#001A4B] text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep3Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep3Desc}</p>
                </div>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full bg-[#001A4B] text-white font-bold py-3 rounded-xl text-sm"
            >
              {t.home.iosGotIt}
            </button>
          </div>
        </>
      )}

      {/* ── 2. PRÓXIMO PARTIDO (mobile) ─────────────────────────── */}
      <div className="md:hidden">
        <NextMatchBanner matches={matches} bets={bets} />
      </div>

      {/* ── 3. CTA PRONÓSTICOS PENDIENTES ───────────────────────── */}
      {totalUnbet > 0 && (
        <Link
          to="/apuestas"
          className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border transition-all hover:scale-[1.01] active:scale-[0.99] ${
            urgentUnbet > 0
              ? 'bg-red-50 border-red-200 hover:bg-red-100'
              : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-2xl shrink-0 ${urgentUnbet > 0 ? 'animate-bounce' : ''}`}>
              ⚽
            </span>
            <div className="min-w-0">
              <p className={`font-bold text-sm leading-tight ${urgentUnbet > 0 ? 'text-red-700' : 'text-amber-800'}`}>
                {t.home.ctaTitle(totalUnbet)}
              </p>
              {urgentUnbet > 0 && (
                <p className="text-xs text-red-500 mt-0.5 font-medium">
                  {t.home.ctaUrgent(urgentUnbet)}
                </p>
              )}
            </div>
          </div>
          <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
            urgentUnbet > 0
              ? 'bg-red-500 text-white'
              : 'bg-amber-500 text-white'
          }`}>
            {t.home.ctaBtn}
          </span>
        </Link>
      )}

      {/* ── 3. ACCESOS RÁPIDOS ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">

        <Link
          to="/apuestas"
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1"
        >
          <div className="text-2xl">⚽</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.bet}</div>
          {totalUnbet > 0 ? (
            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {t.home.pending(totalUnbet)}
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              {t.home.upToDate}
            </span>
          )}
        </Link>

        <Link
          to="/ranking"
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1"
        >
          <div className="text-2xl">🏆</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.ranking}</div>
          {myEntry ? (
            <span className="text-[10px] font-bold t-bg-secondary t-text-accent px-2 py-0.5 rounded-full">
              #{myEntry.position}
            </span>
          ) : (
            <span className="text-[10px] t-text-muted px-2 py-0.5">{t.home.noPosition}</span>
          )}
        </Link>

        <Link
          to="/matriz"
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1"
        >
          <div className="text-2xl">📊</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.matrix}</div>
          {ptsDiff !== null ? (
            ptsDiff === 0 ? (
              <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                {t.home.leader}
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full">
                {t.home.fromFirst(ptsDiff)}
              </span>
            )
          ) : (
            <span className="text-[10px] t-text-muted px-2 py-0.5">{t.home.seeTable}</span>
          )}
        </Link>
      </div>

      {/* ── 3. PODIO ────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <div className="t-surface rounded-2xl border t-border-page shadow-sm overflow-hidden">
          <div className="t-bg-nav px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-bold text-white/90 uppercase tracking-wide">{t.home.currentRanking}</p>
            <Link to="/ranking" className="text-xs text-white/60 hover:text-white transition-colors">
              {t.home.seeComplete}
            </Link>
          </div>

          <div className="flex items-end justify-center gap-1 px-6 pt-6 pb-2">
            {PODIUM_ORDER.map((idx) => {
              const r = top3[idx]
              if (!r) return null
              const isMe = r.user_id === user?.id
              const isFirst = idx === 0
              const podiumH = isFirst ? 'h-10' : idx === 1 ? 'h-6' : 'h-4'
              const podiumBg = isFirst ? 'bg-yellow-400' : idx === 1 ? 'bg-white/20' : 'bg-amber-500/50'
              const avatarSize = isFirst ? 'w-14 h-14' : 'w-10 h-10'
              const avatarBorder = isFirst ? 'border-2 border-yellow-400' : 'border t-border-page'

              return (
                <div key={r.planilla_id} className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative">
                    {r.user_avatar
                      ? <img src={r.user_avatar} alt="" className={`${avatarSize} rounded-full object-cover ${avatarBorder}`} />
                      : <div className={`${avatarSize} rounded-full flex items-center justify-center font-black text-sm ${isMe ? 't-bg-primary text-white' : isFirst ? 'bg-yellow-400/20 text-yellow-400' : 't-surface t-text-muted'}`}>
                          {r.user_name[0].toUpperCase()}
                        </div>
                    }
                    <span className="absolute -top-1 -right-1 text-base leading-none">{MEDAL[idx]}</span>
                  </div>

                  <p className={`text-center font-semibold truncate w-full px-0.5 leading-tight ${isFirst ? 'text-xs t-text-nav' : 'text-[10px] t-text-muted'}`}>
                    {r.user_name.split(' ')[0]}
                    {isMe && <span className="t-text-primary"> {t.home.you}</span>}
                  </p>

                  <p className={`font-black ${isFirst ? 'text-sm t-text-primary' : 'text-xs t-text-muted'}`}>
                    {r.puntos_totales}
                    <span className="font-normal text-[9px] ml-0.5">{t.ranking.pts}</span>
                  </p>

                  <div className={`w-full rounded-t-lg ${podiumH} ${podiumBg}`} />
                </div>
              )
            })}
          </div>

          {myEntry && myEntry.position > 3 && (
            <div className="mx-4 mb-4 mt-1 rounded-xl px-4 py-2.5 flex items-center justify-between border t-border-page"
              style={{ background: 'color-mix(in srgb, var(--theme-primary) 12%, var(--theme-page-surface))' }}>
              <div className="flex items-center gap-2">
                <span className="text-base font-black t-text-primary">#{myEntry.position}</span>
                <span className="text-sm font-semibold t-text-nav">{myEntry.user_name.split(' ')[0]}</span>
              </div>
              <div className="text-right">
                <span className="font-black t-text-primary">{myEntry.puntos_totales}{t.ranking.pts}</span>
                {ptsDiff !== null && ptsDiff > 0 && (
                  <p className="text-[10px] t-text-muted">{t.home.fromFirst(ptsDiff)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. PRÓXIMOS PARTIDOS ────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold t-text-nav">{t.home.nextMatches}</h2>

        {upcoming.length === 0 ? (
          <p className="t-text-muted text-sm text-center py-8">{t.home.noUpcoming}</p>
        ) : (
          upcoming.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              bet={bets[m.id]}
              planillaId={planilla?.id}
              onBetSaved={refreshBets}
              onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
            />
          ))
        )}

        {recentFinished.length > 0 && (
          <>
            <h3 className="text-sm font-semibold t-text-muted mt-4">{t.home.lastResults}</h3>
            {recentFinished.map((m) => (
              <MatchCard key={m.id} match={m} bet={bets[m.id]} readonly />
            ))}
          </>
        )}

        <Link to="/apuestas" className="block text-center text-sm t-text-primary hover:underline py-2">
          {t.home.seeAll}
        </Link>
      </div>

    </div>
  )
}
