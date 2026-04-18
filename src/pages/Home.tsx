import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { MatchCard } from '@/components/match/MatchCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Match, Bet, Planilla, RankingEntry, Tournament } from '@/types'

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
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Reloj para el countdown (cada minuto)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { loadData() }, [])

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
      setTournaments(tourRes.data.data || [])

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

  const tournamentMatches = selectedTournament === 'all'
    ? matches
    : matches.filter(m => m.tournament_id === selectedTournament)

  const pendingMatches = tournamentMatches.filter(m => m.estado !== 'finished')
  const finishedMatches = tournamentMatches.filter(m => m.estado === 'finished')

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

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <div className="t-gradient-hero rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold">{t.home.greeting(user?.nombre || '')}</h1>
        <p className="text-white/70 text-sm mt-0.5">{t.home.subtitle}</p>

        {tournaments.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            <button
              onClick={() => setSelectedTournament('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                selectedTournament === 'all'
                  ? 'bg-white t-text-nav border-white'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
              }`}
            >
              {t.home.all}
            </button>
            {tournaments.map(tour => (
              <button
                key={tour.id}
                onClick={() => setSelectedTournament(tour.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedTournament === tour.id
                    ? 'bg-white t-text-nav border-white'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}
              >
                {tour.name}
              </button>
            ))}
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
      </div>

      {/* ── 2. CTA PRONÓSTICOS PENDIENTES ───────────────────────── */}
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
