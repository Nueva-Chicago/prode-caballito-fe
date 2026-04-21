import { useEffect, useState, useRef, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { EmptyState } from '@/components/ui/EmptyState'
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

function getGreeting(now: Date): string {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

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
        className="text-2xl md:text-3xl font-black tabular-nums rounded-lg px-2.5 py-1.5 min-w-[48px] md:min-w-[56px] text-center leading-none"
        style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--theme-secondary)', fontFamily: "'Arial Black', Arial, sans-serif" }}
      >
        {pad2(value)}
      </div>
      <span className="text-[8px] font-black text-white/45 tracking-widest uppercase">{label}</span>
    </div>
  )
}

function HeroBadge({ tema, theme }: { tema: string; theme: { name: string; pattern?: string; badgeUrl?: string } }) {
  const [imgError, setImgError] = useState(false)
  const showImg = !!theme.badgeUrl && !imgError
  return (
    <div
      className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center border-2 border-white/20 shadow-xl overflow-hidden shrink-0"
      style={{ background: showImg ? 'rgba(255,255,255,0.10)' : (theme.pattern || 'var(--theme-primary)') }}
    >
      {showImg
        ? <img
            src={theme.badgeUrl}
            alt={theme.name}
            className="w-14 h-14 md:w-22 md:h-22 object-contain drop-shadow-xl"
            onError={() => setImgError(true)}
          />
        : tema === 'neutral'
          ? <span style={{ fontSize: 40, lineHeight: 1 }}>🇦🇷</span>
          : <span
              className="text-4xl md:text-5xl font-black text-white drop-shadow"
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

/* Panel derecho del hero en desktop — tarjeta blanca con countdown + flags */
function NextMatchDesktopPanel({ matches, bets }: { matches: Match[]; bets: Record<string, Bet> }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const match = matches
    .filter(m => m.estado !== 'finished' && new Date(m.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null

  if (!match) return null

  const hasBet = !!bets[match.id]
  const dateStr = format(new Date(match.start_time), "EEE d MMM · HH:mm", { locale: esLocale })
  const diffMs = Math.max(0, new Date(match.start_time).getTime() - now)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffHours = Math.floor((diffMs % 86400000) / 3600000)
  const diffMins = Math.floor((diffMs % 3600000) / 60000)

  return (
    <div className="hidden md:flex flex-col justify-center px-6 py-5 md:flex-[2] border-l border-gray-100 bg-white gap-4">

      {/* Countdown */}
      <div className="text-center">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
          FALTA PARA EL PRÓXIMO PARTIDO
        </p>
        <div className="flex items-end justify-center gap-1.5">
          {[{ v: diffDays, l: 'DÍAS' }, { v: diffHours, l: 'HS' }, { v: diffMins, l: 'MIN' }].map(({ v, l }, i) => (
            <>
              {i > 0 && <span key={`sep-${i}`} className="text-gray-300 font-black pb-4 text-sm">:</span>}
              <div key={l} className="flex flex-col items-center gap-1">
                <div className="text-2xl font-black tabular-nums rounded-lg px-2 py-1 min-w-[44px] text-center leading-none"
                  style={{ background: '#001A4B', color: '#FFDF00', fontFamily: "'Arial Black', Arial, sans-serif" }}>
                  {pad2(v)}
                </div>
                <span className="text-[8px] font-black text-gray-400 tracking-widest">{l}</span>
              </div>
            </>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">⚡ Próximo partido</p>
        <Link to="/apuestas" className="text-[10px] font-semibold text-blue-500 hover:underline">
          Ver fixture →
        </Link>
      </div>

      {/* Flags + teams */}
      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-5xl leading-none">{teamFlag(match.home_team) || '🏳'}</span>
          <p className="text-xs font-bold text-gray-700 text-center">{match.home_team}</p>
        </div>
        <p className="text-sm font-black text-gray-300 px-2">VS</p>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-5xl leading-none">{teamFlag(match.away_team) || '🏳'}</span>
          <p className="text-xs font-bold text-gray-700 text-center">{match.away_team}</p>
        </div>
      </div>

      {/* Date */}
      <p className="text-center text-[11px] text-gray-400">
        📅 {dateStr} hs
      </p>

      {/* Bet or CTA */}
      {hasBet ? (
        <div>
          <div className="flex items-center justify-center gap-3 bg-green-50 border border-green-100 rounded-xl py-3">
            <span className="text-xl">{teamFlag(match.home_team) || '🏳'}</span>
            <span className="font-black text-2xl text-green-600">{bets[match.id].goles_local}</span>
            <span className="text-gray-300 font-bold text-xl">—</span>
            <span className="font-black text-2xl text-green-600">{bets[match.id].goles_visitante}</span>
            <span className="text-xl">{teamFlag(match.away_team) || '🏳'}</span>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-wider font-bold">
            TU PRONÓSTICO ✏️
          </p>
        </div>
      ) : (
        <Link
          to="/apuestas"
          className="block text-center font-black text-sm py-3 rounded-xl hover:brightness-95 transition-all"
          style={{ background: '#FFDF00', color: '#001A4B' }}
        >
          🎯 Apostar ahora →
        </Link>
      )}
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
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(new Date())
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const { state: pwaState, install: pwaInstall } = usePWAInstall()
  const { addToast } = useToastStore()
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
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [matchRes, planillaRes, rankRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/ranking?limit=50'),
        api.get('/tournaments').catch(() => ({ data: { data: [] } })),
      ])
      setMatches(matchRes.data.data.matches)
      setRanking(rankRes.data.data.ranking)
      if (!silent) setLoadError(false)

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
      if (silent) {
        addToast(t.home.refreshError, 'warning')
      } else {
        setLoadError(true)
      }
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

  const RELEVANT_WINDOW_MS = 7 * 24 * 3600000
  const totalUnbet = matches
    .filter(m => {
      if (m.estado === 'finished' || bets[m.id]) return false
      const cutoff = new Date(m.time_cutoff).getTime()
      return cutoff > now.getTime() && cutoff - now.getTime() < RELEVANT_WINDOW_MS
    })
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

  // Progreso: cuántos partidos pendientes ya tienen apuesta
  const totalPendingMatches = matches.filter(m => m.estado !== 'finished').length
  const totalBetsMade = matches.filter(m => m.estado !== 'finished' && bets[m.id]).length
  const pct = totalPendingMatches > 0 ? Math.round((totalBetsMade / totalPendingMatches) * 100) : 0


  if (loading) return <HomeSkeleton />

  if (loadError) return (
    <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <span className="text-5xl">📡</span>
      <p className="font-semibold t-text-nav">{t.home.loadError}</p>
      <button
        onClick={() => loadData()}
        className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95"
        style={{ background: 'var(--theme-primary)' }}
      >
        {t.home.loadErrorRetry}
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* ── 1+2. HERO + PRÓXIMO PARTIDO ─────────────────────────── */}
      {/* Mobile: edge-to-edge (-mx-4 cancela el px-4 del padre)     */}
      {/* Desktop: side by side, rounded, shadow                      */}
      <div className="-mx-4 md:mx-0 md:flex md:rounded-2xl md:overflow-hidden md:shadow-2xl">

      {/* Hero */}
      <div
        className="text-white overflow-hidden relative md:flex-[3]"
        style={{ minHeight: 280, background: '#001A4B' }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=1200&q=80')",
            backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.22,
          }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(0,26,75,0.97) 0%, rgba(0,26,75,0.82) 60%, rgba(0,26,75,0.55) 100%)' }}
        />

        <div className="relative px-5 py-5">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-3"
            style={{ background: 'rgba(255,223,0,0.12)', border: '1px solid rgba(255,223,0,0.35)', borderRadius: 99, padding: '5px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFDF00', letterSpacing: '0.06em' }}>
              ✨ PRONÓSTICOS EXCLUSIVOS
            </span>
          </div>

          {/* Título grande */}
          <h1
            className="font-black text-white leading-none mb-1"
            style={{ fontSize: 'clamp(26px, 5.5vw, 40px)', fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 0.97 }}
          >
            EL MUNDIAL<br />SE JUEGA ACÁ<br />
            <em style={{ color: '#FFDF00', fontStyle: 'italic' }}>TAMBIÉN</em>
          </h1>

          {/* Saludo sutil */}
          <p className="text-white/45 text-xs mt-2 mb-3">
            {getGreeting(now)}, {user?.nombre?.split(' ')[0] || 'jugador'}
            {myEntry && <> · #{myEntry.position} · <span style={{ color: 'var(--theme-secondary)' }}>{myEntry.puntos_totales}pts</span></>}
            {myEntry && ptsDiff === 0 && <> · <span className="text-yellow-400 font-bold">¡Líder! 🏆</span></>}
          </p>

          {/* CTA button */}
          {urgentUnbet > 0 ? (
            <Link
              to="/apuestas"
              className="inline-flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              ⚠️ {urgentUnbet} urgentes — Apostar
            </Link>
          ) : (
            <Link
              to="/apuestas"
              className="inline-flex items-center gap-2 font-black text-sm px-5 py-2.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{ background: '#FFDF00', color: '#001A4B', boxShadow: '0 4px 20px rgba(255,223,0,0.35)' }}
            >
              EMPEZÁ TU PRODE ⚡
            </Link>
          )}

          {/* Fecha */}
          <p className="text-white/30 text-[10px] mt-2.5 tracking-wider font-semibold uppercase">
            {format(now, "EEEE, d MMM yyyy", { locale: esLocale })}
          </p>

          {pwaState.type !== 'installed' && pwaState.type !== 'unavailable' && (
            <button
              onClick={() => pwaState.type === 'ios' ? setShowIOSGuide(true) : pwaInstall()}
              className="block text-white/20 text-[9px] mt-1 hover:text-white/45 transition-colors"
            >
              📲 {t.home.installApp}
            </button>
          )}
        </div>
      </div>

      {/* Próximo partido — panel derecho desktop (sin countdown duplicado) */}
      <NextMatchDesktopPanel matches={matches} bets={bets} />

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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className={`text-2xl shrink-0 ${urgentUnbet > 0 ? 'animate-bounce' : ''}`}>
              ⚽
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm leading-tight ${urgentUnbet > 0 ? 'text-red-700' : 'text-amber-800'}`}>
                {t.home.ctaTitle(totalUnbet)}
              </p>
              {/* Barra de progreso */}
              {totalPendingMatches > 0 && !urgentUnbet && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-amber-600 font-semibold shrink-0">{pct}% completado</span>
                </div>
              )}
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
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1.5"
        >
          <div className="text-3xl">⚽</div>
          <div className="text-xs font-bold t-text-nav">{t.home.bet}</div>
          <div className="text-[10px] t-text-muted leading-tight hidden sm:block">Participá y sumá puntos</div>
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
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1.5"
        >
          <div className="text-3xl">🏆</div>
          <div className="text-xs font-bold t-text-nav">{t.home.ranking}</div>
          <div className="text-[10px] t-text-muted leading-tight hidden sm:block">Mirá tu posición</div>
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
          className="t-surface rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border t-border-page flex flex-col items-center gap-1.5"
        >
          <div className="text-3xl">📊</div>
          <div className="text-xs font-bold t-text-nav">{t.home.matrix}</div>
          <div className="text-[10px] t-text-muted leading-tight hidden sm:block">Analizá y dominá</div>
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

      {/* ── 3. RANKING ACTUAL ─────────────────────────────────── */}
      {top3.length > 0 && (
        <div className="t-surface rounded-2xl border t-border-page shadow-sm overflow-hidden">
          <div className="t-bg-nav px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-bold text-white/90 uppercase tracking-wide">{t.home.currentRanking}</p>
            <Link to="/ranking" className="text-xs text-white/60 hover:text-white transition-colors">
              {t.home.seeComplete}
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {top3.map((r, i) => {
              const isMe = r.user_id === user?.id
              return (
                <div
                  key={r.planilla_id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                >
                  <span className="text-lg w-7 text-center leading-none">{MEDAL[i]}</span>
                  {r.user_avatar
                    ? <img src={r.user_avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0" />
                    : <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isMe ? 't-bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {r.user_name[0].toUpperCase()}
                      </div>
                  }
                  <p className="font-semibold text-sm t-text-nav flex-1 truncate">
                    {r.user_name.split(' ')[0]}
                    {isMe && <span className="text-xs t-text-muted font-normal"> {t.home.you}</span>}
                  </p>
                  <p className="font-black t-text-primary text-sm shrink-0">
                    {r.puntos_totales}
                    <span className="font-normal text-[10px] t-text-muted ml-0.5">{t.ranking.pts}</span>
                  </p>
                </div>
              )
            })}

            {myEntry && myEntry.position > 3 && (
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'color-mix(in srgb, var(--theme-primary) 8%, white)' }}
              >
                <span className="text-sm font-black t-text-primary w-7 text-center">#{myEntry.position}</span>
                {myEntry.user_avatar
                  ? <img src={myEntry.user_avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0" />
                  : <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 t-bg-primary text-white">
                      {myEntry.user_name[0].toUpperCase()}
                    </div>
                }
                <p className="font-semibold text-sm t-text-nav flex-1 truncate">
                  {myEntry.user_name.split(' ')[0]}
                  <span className="text-xs t-text-muted font-normal"> {t.home.you}</span>
                </p>
                <div className="text-right shrink-0">
                  <p className="font-black t-text-primary text-sm">
                    {myEntry.puntos_totales}
                    <span className="font-normal text-[10px] t-text-muted ml-0.5">{t.ranking.pts}</span>
                  </p>
                  {ptsDiff !== null && ptsDiff > 0 && (
                    <p className="text-[10px] t-text-muted">{t.home.fromFirst(ptsDiff)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. PRÓXIMOS PARTIDOS ────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold t-text-nav">{t.home.nextMatches}</h2>

        {upcoming.length === 0 ? (
          <EmptyState icon="📅" message={t.home.noUpcoming} />
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
