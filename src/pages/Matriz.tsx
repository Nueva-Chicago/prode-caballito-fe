import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useAuthStore } from '@/store/authStore'
import type { Match, RankingEntry, Tournament } from '@/types'

type BetEntry = { home: number; away: number }

interface MatchStat {
  match: Match
  exact: number
  correct: number
  total: number
  topPred: { score: string; count: number } | null
}

function computeMatchStats(match: Match, bets: BetMap, ranking: RankingEntry[]): MatchStat {
  let exact = 0, correct = 0, total = 0
  const predCounts: Record<string, number> = {}
  ranking.forEach(r => {
    const b = bets[r.planilla_id]?.[match.id] as BetEntry | undefined
    if (!b) return
    total++
    const key = `${b.home}-${b.away}`
    predCounts[key] = (predCounts[key] || 0) + 1
    const res = calcularPuntaje(
      { goles_local: b.home, goles_visitante: b.away },
      { resultado_local: match.resultado_local!, resultado_visitante: match.resultado_visitante! }
    )
    if (res.color === 'rojo' || res.color === 'celeste') exact++
    if (res.puntos > 0) correct++
  })
  const topEntry = Object.entries(predCounts).sort(([, a], [, b]) => b - a)[0]
  return { match, exact, correct, total, topPred: topEntry ? { score: topEntry[0], count: topEntry[1] } : null }
}

function ViralHighlights({ stats, lang }: { stats: MatchStat[]; lang: string }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  if (stats.length === 0) return null

  const displayed = expanded ? stats : stats.slice(0, 3)

  const handleShare = async (s: MatchStat) => {
    const m = s.match
    const text = t.viral.shareText(
      lang === 'pt' && m.home_team_pt ? m.home_team_pt : m.home_team,
      lang === 'pt' && m.away_team_pt ? m.away_team_pt : m.away_team,
      m.resultado_local!, m.resultado_visitante!,
      s.exact, s.total
    )
    if (navigator.share) {
      await navigator.share({ text, url: 'https://prodecaballito.com/ranking' }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(m.id)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-2 space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.viral.title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map(s => {
          const m = s.match
          const exactPct = s.total > 0 ? Math.round((s.exact / s.total) * 100) : 0
          const isHard = s.exact === 0 || exactPct <= 10
          const isEasy = exactPct >= 50
          return (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base">{teamFlag(m.home_team) || '🏳'}</span>
                  <span className="font-black text-[#001A4B] text-sm tabular-nums">{m.resultado_local}-{m.resultado_visitante}</span>
                  <span className="text-base">{teamFlag(m.away_team) || '🏳'}</span>
                </div>
                {isHard && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0">{t.viral.hardest}</span>}
                {!isHard && isEasy && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full shrink-0">{t.viral.easiest}</span>}
              </div>
              {/* Teams */}
              <p className="text-[11px] text-gray-400 truncate">
                {(lang === 'pt' && m.home_team_pt ? m.home_team_pt : m.home_team)} vs {(lang === 'pt' && m.away_team_pt ? m.away_team_pt : m.away_team)}
              </p>
              {/* Stats */}
              {s.total > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700">{t.viral.exact(s.exact, s.total)}</p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${s.exact === 0 ? 'bg-gray-300' : 'bg-red-400'}`}
                      style={{ width: `${exactPct}%` }}
                    />
                  </div>
                  {s.topPred && (
                    <p className="text-[11px] text-gray-400">{t.viral.topPred(s.topPred.score, s.topPred.count)}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">{t.viral.noBets}</p>
              )}
              {/* Share */}
              {s.total > 0 && (
                <button
                  onClick={() => handleShare(s)}
                  className="w-full text-xs font-semibold text-[#001A4B] border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
                >
                  {copied === m.id ? t.viral.copied : t.viral.share}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {stats.length > 3 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium"
        >
          {expanded ? t.viral.seeLess : t.viral.seeAll + ` (${stats.length - 3} más)`}
        </button>
      )}
    </div>
  )
}

type BetMap = Record<string, Record<string, { home: number; away: number }>>

interface ActiveCell {
  matchId: string
  rowKey: string
  bet: { home: number; away: number }
  match: Match
  result: { puntos: number; bonus: boolean; color: string }
  rect: DOMRect
}

/* ── Popover de detalle ──────────────────────────────────────────── */
function BetPopover({ cell, onClose }: { cell: ActiveCell; onClose: () => void }) {
  const t = useT()
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const popW = Math.min(220, window.innerWidth - 24)
  const popH = 200
  const rawTop  = cell.rect.bottom + 8
  const rawLeft = cell.rect.left + cell.rect.width / 2 - popW / 2
  const top  = rawTop + popH > window.innerHeight - 16
    ? Math.max(8, cell.rect.top - 8 - popH)
    : rawTop
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popW - 8))

  const { match, bet, result } = cell
  const isExactoLocal = bet.home === match.resultado_local
  const isExactoVisitante = bet.away === match.resultado_visitante
  const color = result.color as string

  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: popW }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-pop"
    >
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          <span className="truncate">{match.home_team}</span>
          <span className="text-gray-300">vs</span>
          <span className="truncate text-right">{match.away_team}</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="text-2xl font-black text-gray-800">{match.resultado_local}</span>
          <span className="text-xs text-gray-300 font-bold">—</span>
          <span className="text-2xl font-black text-gray-800">{match.resultado_visitante}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{t.match.yourBet}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-black ${isExactoLocal ? 'text-green-600' : 'text-gray-700'}`}>
              {bet.home}
            </span>
            <span className="text-gray-300 text-xs">-</span>
            <span className={`text-sm font-black ${isExactoVisitante ? 'text-green-600' : 'text-gray-700'}`}>
              {bet.away}
            </span>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
          color === 'celeste' ? 'bg-sky-50' :
          color === 'rojo'    ? 'bg-red-50' :
          color === 'verde'   ? 'bg-green-50' :
          color === 'amarillo'? 'bg-yellow-50' :
                                'bg-gray-50'
        }`}>
          <span className="text-xs font-semibold text-gray-600">
            {t.match.popIcons[color as keyof typeof t.match.popIcons]} {t.match.popLabels[color as keyof typeof t.match.popLabels]}
          </span>
          <span className={`text-lg font-black ${
            color === 'celeste' ? 'text-sky-500' :
            color === 'rojo'    ? 'text-red-500' :
            color === 'verde'   ? 'text-green-600' :
            color === 'amarillo'? 'text-yellow-500' :
                                  'text-gray-400'
          }`}>
            {result.puntos > 0 ? `+${result.puntos}` : '0'}
          </span>
        </div>

        {result.bonus && (
          <p className="text-[11px] text-sky-500 font-medium text-center">
            {t.match.bonusNote}
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}

export function Matriz() {
  const { user } = useAuthStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set())
  const [unlocks, setUnlocks] = useState<Map<string, 'approved' | 'pending'>>(new Map())
  const [pendingUnlock, setPendingUnlock] = useState<{ targetUserId: string; targetName: string; match: Match } | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [payStep, setPayStep] = useState<'info' | 'reference'>('info')
  const [paymentRef, setPaymentRef] = useState('')
  const [unlockConfig, setUnlockConfig] = useState<{ price: number; currency: string; payment_link: string; free: boolean }>({ price: 0, currency: 'ARS', payment_link: '', free: true })
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const parseUnlocks = (data: { target_user_id: string; match_id: string; status: string }[]) => {
    const map = new Map<string, 'approved' | 'pending'>()
    data.forEach(u => map.set(`${u.target_user_id}_${u.match_id}`, u.status as 'approved' | 'pending'))
    return map
  }

  const refreshUnlocks = useCallback(async () => {
    try {
      const { data } = await api.get('/bets/my-unlocks')
      setUnlocks(parseUnlocks(data.data || []))
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/matches?limit=200'),
      api.get('/ranking?limit=200&include_unpaid=true'),
      api.get('/bets/all-for-matrix'),
      api.get('/tournaments'),
      api.get('/bets/my-unlocks').catch(() => ({ data: { data: [] } })),
      api.get('/bets/unlock-price').catch(() => ({ data: { data: { price: 0, currency: 'ARS', payment_link: '', free: true } } })),
      api.get('/ranking/favorites').catch(() => ({ data: { data: [] } })),
    ]).then(([mRes, rRes, bRes, tRes, uRes, priceRes, favRes]) => {
      setMatches(mRes.data.data.matches)
      setRanking(rRes.data.data.ranking)
      setBets(bRes.data.data)
      const tourList = tRes.data.data || []
      setTournaments(tourList)
      if (tourList.length > 0) setSelectedTournament(tourList[0].id)
      setUnlocks(parseUnlocks(uRes.data.data || []))
      if (priceRes.data.data) setUnlockConfig(priceRes.data.data)
      setFavorites(new Set(favRes.data.data || []))
    }).finally(() => setLoading(false))
  }, [])

  // Refresca el estado de unlocks cuando el usuario vuelve a esta pestaña
  // (ej: el admin aprueba en Admin y luego vuelve a Matriz)
  useEffect(() => {
    window.addEventListener('focus', refreshUnlocks)
    return () => window.removeEventListener('focus', refreshUnlocks)
  }, [refreshUnlocks])

  const handleRequestUnlock = async () => {
    if (!pendingUnlock) return
    setUnlocking(true)
    try {
      await api.post('/bets/request-unlock', {
        target_user_id: pendingUnlock.targetUserId,
        match_id: pendingUnlock.match.id,
        payment_reference: paymentRef.trim() || undefined,
      })
      const key = `${pendingUnlock.targetUserId}_${pendingUnlock.match.id}`
      setUnlocks(prev => new Map([...prev, [key, 'pending']]))
      setPendingUnlock(null)
      setPayStep('info')
      setPaymentRef('')
    } catch {
      setPendingUnlock(null)
      setPayStep('info')
      setPaymentRef('')
    } finally {
      setUnlocking(false)
    }
  }

  const handleClosePendingUnlock = () => {
    setPendingUnlock(null)
    setPayStep('info')
    setPaymentRef('')
  }

  useEffect(() => {
    setLoadingTournament(false)
  }, [selectedTournament])

  const handleToggleFavorite = useCallback(async (planillaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingFav) return
    setTogglingFav(planillaId)
    try {
      const { data } = await api.post(`/ranking/favorites/${planillaId}`, {})
      setFavorites(prev => {
        const next = new Set(prev)
        if (data.action === 'added') next.add(planillaId)
        else next.delete(planillaId)
        return next
      })
    } catch { /* silent */ } finally { setTogglingFav(null) }
  }, [togglingFav])

  const handleBadgeClick = useCallback((
    e: React.MouseEvent<HTMLSpanElement>,
    matchId: string,
    rowKey: string,
    bet: { home: number; away: number },
    match: Match,
    result: { puntos: number; bonus: boolean; color: string }
  ) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (activeCell?.matchId === matchId && activeCell?.rowKey === rowKey) {
      setActiveCell(null)
      return
    }
    setActiveCell({ matchId, rowKey, bet, match, result, rect })
  }, [activeCell])

  const lang = useAuthStore(s => s.user?.idioma_pref || 'es')

  const filteredMatches = selectedTournament
    ? matches.filter(m => m.tournament_id === selectedTournament)
    : matches
  const finishedMatches = filteredMatches.filter(m => m.estado === 'finished')
  const pendingMatches  = filteredMatches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  // Viral stats: last finished matches sorted by date desc
  const viralStats = useMemo(() => {
    return [...finishedMatches]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .map(m => computeMatchStats(m, bets, ranking))
  }, [finishedMatches, bets, ranking])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const baseRows: RankingEntry[] = selectedTournament
    ? ranking.filter(r => allMatches.some(m => bets[r.planilla_id]?.[m.id]))
    : ranking

  const tournamentPts = new Map<string, number>()
  baseRows.forEach(r => {
    const playerBets = bets[r.planilla_id] || {}
    const pts = finishedMatches.reduce((total, m) => {
      const b = playerBets[m.id]
      if (!b || m.resultado_local === undefined || m.resultado_visitante === undefined) return total
      return total + calcularPuntaje(
        { goles_local: b.home, goles_visitante: b.away },
        { resultado_local: m.resultado_local!, resultado_visitante: m.resultado_visitante! }
      ).puntos
    }, 0)
    tournamentPts.set(r.planilla_id, pts)
  })

  const rows = [...baseRows].sort(
    (a, b) => (tournamentPts.get(b.planilla_id) ?? 0) - (tournamentPts.get(a.planilla_id) ?? 0)
  )

  const getBetsForRow = (r: RankingEntry) => bets[r.planilla_id] || {}

  return (
    <div className="px-2 py-4 space-y-3" onClick={() => setActiveCell(null)}>
      <style>{`
        @keyframes pop {
          0%   { opacity: 0; transform: scale(0.92) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop { animation: pop 0.15s ease-out both; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 4px #84cc16, 0 0 8px #84cc16; }
          50%       { box-shadow: 0 0 8px #bef264, 0 0 16px #a3e635; }
        }
        .badge-unlocked {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 900;
          background: linear-gradient(135deg, #bef264 0%, #84cc16 100%);
          color: #1a2e05;
          animation: neon-pulse 2s ease-in-out infinite;
          white-space: nowrap;
          cursor: default;
          letter-spacing: 0.02em;
        }
        .badge-paid {
          background: linear-gradient(90deg, #92400e 0%, #d97706 30%, #fde68a 50%, #d97706 70%, #92400e 100%);
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
          color: #451a03;
          font-weight: 900;
          font-size: 10px;
          border-radius: 5px;
          padding: 2px 5px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          letter-spacing: 0.02em;
          box-shadow: 0 0 0 1px #d97706, 0 1px 4px rgba(217,119,6,0.4);
          cursor: default;
          user-select: none;
          white-space: nowrap;
        }
        .badge-paid:hover {
          box-shadow: 0 0 0 1px #d97706, 0 2px 8px rgba(217,119,6,0.6);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#001A4B]">{t.matrix.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            {t.matrix.players(rows.length)} · {t.matrix.matches(allMatches.length)}
          </p>
        </div>

        {tournaments.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tournaments.map(tour => (
              <button
                key={tour.id}
                onClick={(e) => { e.stopPropagation(); setSelectedTournament(tour.id) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === tour.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {tour.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {finishedMatches.length > 0 && (
        <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs items-center">
          {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation()
                setFilterColors(prev => {
                  const next = new Set(prev)
                  next.has(c) ? next.delete(c) : next.add(c)
                  return next
                })
              }}
              className={`px-2 py-0.5 rounded font-medium transition-all ${POINT_COLORS[c]} ${
                filterColors.has(c)
                  ? 'ring-2 ring-offset-1 ring-gray-500 scale-105 shadow'
                  : filterColors.size > 0
                    ? 'opacity-40'
                    : ''
              }`}
            >
              {t.matrix.ptsLabel[c]}
            </button>
          ))}
          {filterColors.size > 0 && (
            <button
              onClick={() => setFilterColors(new Set())}
              className="text-gray-400 hover:text-gray-600 font-medium ml-1"
            >
              ✕ limpiar
            </button>
          )}
          {filterColors.size === 0 && <span className="text-gray-400 ml-1">{t.matrix.legend}</span>}
        </div>
      )}

      {/* Viral highlights */}
      {viralStats.length > 0 && <ViralHighlights stats={viralStats} lang={lang} />}

      {activeCell && (
        <BetPopover cell={activeCell} onClose={() => setActiveCell(null)} />
      )}

      {loadingTournament ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : allMatches.length === 0 ? (
        <div className="max-w-7xl mx-auto px-2 text-center py-10 text-gray-400 text-sm">
          {t.matrix.noMatches}
        </div>
      ) : (
        <div ref={tableRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#001A4B] text-white">
                <th className="sticky left-0 bg-[#001A4B] px-3 py-2 text-left font-semibold z-30 min-w-[180px]">
                  {t.ranking.player}
                </th>
                <th className="px-2 py-2 text-center font-semibold w-14 bg-[#001A4B]">{t.ranking.pts}</th>
                {allMatches.map((m) => (
                  <th key={m.id} className="px-1 py-2 text-center font-medium min-w-[60px] bg-[#001A4B]">
                    {teamFlag(m.home_team)
                      ? <div className="text-base leading-none">{teamFlag(m.home_team)}</div>
                      : <div className="truncate max-w-[55px]">{m.home_team.substring(0,3).toUpperCase()}</div>
                    }
                    <div className="text-[10px] text-white/60">vs</div>
                    {teamFlag(m.away_team)
                      ? <div className="text-base leading-none">{teamFlag(m.away_team)}</div>
                      : <div className="truncate max-w-[55px]">{m.away_team.substring(0,3).toUpperCase()}</div>
                    }
                    {m.estado === 'finished' && (
                      <div className="text-[#FFDF00] font-bold text-[11px]">{m.resultado_local}-{m.resultado_visitante}</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const isMe = r.user_id === user?.id
                const playerBets = getBetsForRow(r)
                const rowBg = isMe ? 'bg-blue-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                const rowKey = `${r.planilla_id}-${ri}`
                const pts = tournamentPts.get(r.planilla_id) ?? 0
                const pos = ri + 1
                return (
                  <tr key={rowKey} className={`${rowBg} hover:bg-yellow-50/50 transition-colors`}>
                    <td className={`sticky left-0 px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {pos}
                        </span>
                        {r.user_avatar
                          ? <img src={r.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100" />
                          : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-300 text-gray-600'}`}>
                              {r.user_name[0].toUpperCase()}
                            </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className={`truncate max-w-[105px] font-semibold ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                            {r.user_name}
                          </div>
                          {r.nombre_planilla && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[105px]">{r.nombre_planilla}</div>
                          )}
                        </div>
                        {r.whatsapp_number && !isMe && (
                          <a
                            href={`https://wa.me/${r.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`WhatsApp a ${r.user_name}`}
                            className="shrink-0 transition-opacity opacity-80 hover:opacity-100 leading-none"
                            style={{ color: '#25D366' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.057 23.57a.5.5 0 00.613.613l5.708-1.475A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.733.965.99-3.619-.235-.373A9.818 9.818 0 112 12c0-5.42 4.398-9.818 9.818-9.818z"/></svg>
                          </a>
                        )}
                        {!isMe && (
                          <button
                            onClick={(e) => handleToggleFavorite(r.planilla_id, e)}
                            disabled={togglingFav === r.planilla_id}
                            className="shrink-0 text-sm leading-none opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                            title={favorites.has(r.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                          >
                            {favorites.has(r.planilla_id) ? '⭐' : '☆'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center font-black text-[#0042A5]">{pts}</td>
                    {allMatches.map((m) => {
                      const b = playerBets[m.id]
                      const isCutoffPassed = new Date() > new Date(m.time_cutoff)

                      if (m.estado === 'finished' && m.resultado_local !== undefined) {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        const res = calcularPuntaje(
                          { goles_local: b.home, goles_visitante: b.away },
                          { resultado_local: m.resultado_local, resultado_visitante: m.resultado_visitante! }
                        )
                        const isActive = activeCell?.matchId === m.id && activeCell?.rowKey === rowKey
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center">
                            <span
                              onClick={(e) => handleBadgeClick(e, m.id, rowKey, b, m, res)}
                              className={`inline-block px-1.5 py-0.5 rounded font-bold text-[11px] cursor-pointer select-none transition-all
                                ${POINT_COLORS[res.color]}
                                ${isActive ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105 hover:shadow-md'}
                                ${filterColors.size > 0 && !filterColors.has(res.color) ? 'opacity-10 pointer-events-none' : ''}
                              `}
                            >
                              {b.home}-{b.away}
                            </span>
                          </td>
                        )
                      }

                      const unlockStatus = unlocks.get(`${r.user_id}_${m.id}`)
                      if (isMe || isCutoffPassed || unlockStatus === 'approved') {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        // Apuesta desbloqueada (aprobada) — badge fluor neon
                        if (!isMe && !isCutoffPassed && unlockStatus === 'approved') {
                          return (
                            <td key={m.id} className="px-1 py-1.5 text-center">
                              <span className="badge-unlocked" title="Desbloqueada ✓">
                                🔓 {b.home}-{b.away}
                              </span>
                            </td>
                          )
                        }
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center text-gray-500 font-medium">
                            {b.home}-{b.away}
                          </td>
                        )
                      }

                      if (unlockStatus === 'pending') {
                        const isPaid = !unlockConfig.free
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center">
                            {isPaid
                              ? <span className="badge-paid" title={t.matrix.paid}>🪙 $</span>
                              : <span className="inline-block text-[13px]" title={t.matrix.pendingFree}>⏳</span>
                            }
                          </td>
                        )
                      }

                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center">
                          {b
                            ? <span
                                onClick={(e) => { e.stopPropagation(); setPendingUnlock({ targetUserId: r.user_id, targetName: r.user_name, match: m }) }}
                                className="inline-block px-1.5 py-0.5 rounded text-[13px] bg-gray-100 select-none cursor-pointer hover:bg-gray-200 transition-colors"
                                title={t.matrix.lockTitle}
                              >🔒</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet de desbloqueo */}
      {pendingUnlock && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={handleClosePendingUnlock} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6"
            style={{ animation: 'slideUp 0.2s ease-out both' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{unlockConfig.free ? '🔓' : '💳'}</div>
              <h3 className="font-bold t-text-nav text-base">
                {unlockConfig.free ? t.matrix.unlockTitle : t.matrix.payStep1Title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 font-medium">{pendingUnlock.targetName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pendingUnlock.match.home_team} vs {pendingUnlock.match.away_team}
              </p>
            </div>

            {/* FLUJO GRATUITO */}
            {unlockConfig.free && (
              <>
                <p className="text-xs text-gray-400 text-center mb-5 leading-relaxed">
                  {t.matrix.freeInstructions}
                </p>
                <div className="flex gap-3">
                  <button onClick={handleClosePendingUnlock}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    {t.matrix.cancel}
                  </button>
                  <button onClick={handleRequestUnlock} disabled={unlocking}
                    className="flex-1 t-btn-primary text-sm py-3">
                    {unlocking ? t.matrix.sending : t.matrix.sendRequest}
                  </button>
                </div>
              </>
            )}

            {/* FLUJO PAGO — paso 1 */}
            {!unlockConfig.free && payStep === 'info' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">{t.matrix.payStep1Cost}</p>
                  <p className="text-3xl font-black text-amber-600">${unlockConfig.price.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{unlockConfig.currency}</p>
                </div>
                <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
                  {t.matrix.payInstructions}
                </p>
                <div className="flex gap-3">
                  <button onClick={handleClosePendingUnlock}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    {t.matrix.cancel}
                  </button>
                  {unlockConfig.payment_link ? (
                    <a
                      href={unlockConfig.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setTimeout(() => setPayStep('reference'), 1500)}
                      className="flex-1 bg-[#009EE3] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#0086c3] transition-colors"
                    >
                      {t.matrix.payBtn}
                    </a>
                  ) : (
                    <button onClick={() => setPayStep('reference')}
                      className="flex-1 t-btn-primary text-sm py-3">
                      {t.matrix.paidBtn}
                    </button>
                  )}
                </div>
                {unlockConfig.payment_link && (
                  <button onClick={() => setPayStep('reference')}
                    className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-2">
                    {t.matrix.alreadyPaid}
                  </button>
                )}
              </>
            )}

            {/* FLUJO PAGO — paso 2 */}
            {!unlockConfig.free && payStep === 'reference' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {t.matrix.refTitle}
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder={t.matrix.refPlaceholder}
                    autoFocus
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3]"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    {t.matrix.refHint}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPayStep('info')}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    {t.matrix.back}
                  </button>
                  <button onClick={handleRequestUnlock} disabled={unlocking || !paymentRef.trim()}
                    className="flex-1 t-btn-primary text-sm py-3 disabled:opacity-40">
                    {unlocking ? t.matrix.sending : t.matrix.sendRequest}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
