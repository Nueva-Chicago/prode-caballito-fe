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
      <div className="t-gradient-hero rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="animate-pulse bg-white/30 h-3 w-20 rounded" />
            <div className="animate-pulse bg-white/40 h-6 w-44 rounded" />
            <div className="animate-pulse bg-white/30 h-4 w-56 rounded" />
          </div>
          <div className="animate-pulse bg-white/20 rounded-full shrink-0 w-14 h-14" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <div className="animate-pulse bg-white/30 h-3 w-28 rounded" />
            <div className="animate-pulse bg-white/30 h-3 w-8 rounded" />
          </div>
          <div className="animate-pulse bg-white/20 h-2 w-full rounded-full" />
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

function formatCountdown(cutoffMs: number, nowMs: number): string {
  const diff = cutoffMs - nowMs
  if (diff <= 0) return '—'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function Home() {
  const { user } = useAuthStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [tournamentName, setTournamentName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const { state: pwaState, install: pwaInstall } = usePWAInstall()

  // Reloj para el countdown (cada minuto)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
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
      const [matchRes, planillaRes, rankRes, tourRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/ranking?limit=50'),
        api.get('/tournaments').catch(() => ({ data: { data: [] } })),
      ])
      setMatches(matchRes.data.data.matches)
      setRanking(rankRes.data.data.ranking)
      const tours = tourRes.data.data || []
      if (tours.length > 0) setTournamentName(tours[0].name)

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

  const pendingMatches = matches.filter(m => m.estado !== 'finished')
  const finishedMatches = matches.filter(m => m.estado === 'finished')

  const progress = planilla ? {
    done: pendingMatches.filter(m => bets[m.id]).length,
    total: pendingMatches.length,
  } : null

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

  // ── Saludo personalizado ──────────────────────────────────────────
  const hour = now.getHours()
  const timeGreeting = hour >= 6 && hour < 13
    ? t.home.goodMorning
    : hour >= 13 && hour < 20
      ? t.home.goodAfternoon
      : t.home.goodEvening

  const contextMessage = (() => {
    const isLeading = myEntry?.position === 1
    const allDone = totalUnbet === 0 && matches.filter(m => m.estado !== 'finished').length > 0
    if (isLeading && allDone) return t.home.contextLeadingAllDone
    if (isLeading) return t.home.contextLeading
    if (myEntry && myEntry.position <= 3) return t.home.contextPodium(myEntry.position)
    if (allDone) return t.home.contextAllDone
    if (totalUnbet > 0) return t.home.contextPending(totalUnbet)
    if (myEntry) return t.home.contextDefault(myEntry.position)
    return t.home.contextNoRanking
  })()

  if (loading) return <HomeSkeleton />

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <div className="t-gradient-hero rounded-2xl text-white overflow-hidden">
        <div className="md:grid md:grid-cols-[55fr_45fr]">

          {/* Columna izquierda */}
          <div className="p-5 md:border-r md:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-0.5">{timeGreeting}</p>
                <h1 className="text-xl font-bold leading-tight">{t.home.greeting(user?.nombre || '')} 👋</h1>
                <p className="text-white/75 text-sm mt-1 leading-snug">{contextMessage}</p>
              </div>
            </div>

            {tournamentName && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1 rounded-full text-[11px] font-semibold text-white/90">
                  🏆 {tournamentName}
                </span>
              </div>
            )}

            {progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1 text-white/80">
                  <span>{t.home.completedBets}</span>
                  <span className="font-bold">{progress.done}/{progress.total}</span>
                </div>
                <div className="bg-white/20 rounded-full h-2">
                  <div
                    className="t-bg-secondary h-2 rounded-full transition-all"
                    style={{ width: `${progress.total ? Math.min((progress.done / progress.total) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* ⏰ Cierra pronto */}
            {closingSoon.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wide">⏰ {t.home.closingSoon}</p>
                {closingSoon.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-2 border border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                      <span className="text-xs font-medium text-white/90 truncate">
                        {m.home_team} vs {m.away_team}
                      </span>
                      {!bets[m.id] && (
                        <span className="shrink-0 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                          {t.home.noBet}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black text-red-300 shrink-0 ml-2">
                      {formatCountdown(new Date(m.time_cutoff).getTime(), now.getTime())}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 📲 Botón instalar app */}
            {pwaState.type !== 'installed' && pwaState.type !== 'unavailable' && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => pwaState.type === 'ios' ? setShowIOSGuide(true) : pwaInstall()}
                  className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-colors group"
                >
                  <span className="text-base">📲</span>
                  <span>{t.home.installApp}</span>
                  <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
                </button>
              </div>
            )}
          </div>

          {/* Columna derecha — próximo partido (solo desktop) */}
          <div
            className="hidden md:flex flex-col justify-center px-6 py-5"
            style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #001A4B 100%)' }}
          >
            <NextMatchBanner matches={matches} bets={bets} embedded />
          </div>

        </div>
      </div>

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

      {/* ── 2. PRÓXIMO PARTIDO — solo mobile (desktop va dentro del hero) ── */}
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
          className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col items-center gap-1"
        >
          <div className="text-2xl">⚽</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.bet}</div>
          {totalUnbet > 0 ? (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {t.home.pending(totalUnbet)}
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
              {t.home.upToDate}
            </span>
          )}
        </Link>

        <Link
          to="/ranking"
          className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col items-center gap-1"
        >
          <div className="text-2xl">🏆</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.ranking}</div>
          {myEntry ? (
            <span className="text-[10px] font-bold t-bg-secondary t-text-accent px-2 py-0.5 rounded-full">
              #{myEntry.position}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 px-2 py-0.5">{t.home.noPosition}</span>
          )}
        </Link>

        <Link
          to="/matriz"
          className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col items-center gap-1"
        >
          <div className="text-2xl">📊</div>
          <div className="text-xs font-semibold t-text-nav">{t.home.matrix}</div>
          {ptsDiff !== null ? (
            ptsDiff === 0 ? (
              <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {t.home.leader}
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full">
                {t.home.fromFirst(ptsDiff)}
              </span>
            )
          ) : (
            <span className="text-[10px] text-gray-400 px-2 py-0.5">{t.home.seeTable}</span>
          )}
        </Link>
      </div>

      {/* ── 3. PODIO ────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
              const podiumBg = isFirst ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : 'bg-amber-500/70'
              const avatarSize = isFirst ? 'w-14 h-14' : 'w-10 h-10'
              const avatarBorder = isFirst ? 'border-2 border-yellow-400' : 'border border-gray-200'

              return (
                <div key={r.planilla_id} className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative">
                    {r.user_avatar
                      ? <img src={r.user_avatar} alt="" className={`${avatarSize} rounded-full object-cover ${avatarBorder}`} />
                      : <div className={`${avatarSize} rounded-full flex items-center justify-center font-black text-sm ${isMe ? 't-bg-primary text-white' : isFirst ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.user_name[0].toUpperCase()}
                        </div>
                    }
                    <span className="absolute -top-1 -right-1 text-base leading-none">{MEDAL[idx]}</span>
                  </div>

                  <p className={`text-center font-semibold truncate w-full px-0.5 leading-tight ${isFirst ? 'text-xs t-text-nav' : 'text-[10px] text-gray-500'}`}>
                    {r.user_name.split(' ')[0]}
                    {isMe && <span className="t-text-primary"> {t.home.you}</span>}
                  </p>

                  <p className={`font-black ${isFirst ? 'text-sm t-text-primary' : 'text-xs text-gray-500'}`}>
                    {r.puntos_totales}
                    <span className="font-normal text-[9px] ml-0.5">{t.ranking.pts}</span>
                  </p>

                  <div className={`w-full rounded-t-lg ${podiumH} ${podiumBg}`} />
                </div>
              )
            })}
          </div>

          {myEntry && myEntry.position > 3 && (
            <div className="mx-4 mb-4 mt-1 rounded-xl px-4 py-2.5 flex items-center justify-between border"
              style={{ background: 'color-mix(in srgb, var(--theme-primary) 8%, white)', borderColor: 'color-mix(in srgb, var(--theme-primary) 20%, white)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base font-black t-text-primary">#{myEntry.position}</span>
                <span className="text-sm font-semibold t-text-nav">{myEntry.user_name.split(' ')[0]}</span>
              </div>
              <div className="text-right">
                <span className="font-black t-text-primary">{myEntry.puntos_totales}{t.ranking.pts}</span>
                {ptsDiff !== null && ptsDiff > 0 && (
                  <p className="text-[10px] text-gray-400">{t.home.fromFirst(ptsDiff)}</p>
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
          <p className="text-gray-400 text-sm text-center py-8">{t.home.noUpcoming}</p>
        ) : (
          upcoming.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              bet={bets[m.id]}
              planillaId={planilla?.id}
              onBetSaved={(b) => setBets({ ...bets, [m.id]: b })}
              onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
            />
          ))
        )}

        {recentFinished.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-gray-500 mt-4">{t.home.lastResults}</h3>
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
