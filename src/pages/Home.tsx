import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { MatchCard } from '@/components/match/MatchCard'
import { Spinner } from '@/components/ui/Spinner'
import type { Match, Bet, Planilla, RankingEntry, Tournament } from '@/types'

export function Home() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'partidos' | 'ranking'>('partidos')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [matchRes, planillaRes, rankRes, tourRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/ranking?limit=10'),
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

  // Matches filtrados por torneo seleccionado
  const tournamentMatches = selectedTournament === 'all'
    ? matches
    : matches.filter(m => m.tournament_id === selectedTournament)

  const pendingMatches = tournamentMatches.filter(m => m.estado !== 'finished')
  const finishedMatches = tournamentMatches.filter(m => m.estado === 'finished')

  // Progreso: apuestas hechas sobre partidos pendientes del torneo
  const progress = planilla ? {
    done: pendingMatches.filter(m => bets[m.id]).length,
    total: pendingMatches.length,
  } : null

  // Partidos para mostrar en el tab
  const upcoming = pendingMatches.slice(0, 5)
  const recentFinished = finishedMatches.slice(0, 3)

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header bienvenida + progreso */}
      <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold">¡Hola, {user?.nombre}! 👋</h1>
        <p className="text-white/70 text-sm mt-0.5">PRODE Caballito</p>

        {/* Selector de torneo */}
        {tournaments.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            <button
              onClick={() => setSelectedTournament('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                selectedTournament === 'all'
                  ? 'bg-white text-[#001A4B] border-white'
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
              }`}
            >
              Todos
            </button>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTournament(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  selectedTournament === t.id
                    ? 'bg-white text-[#001A4B] border-white'
                    : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Barra de progreso */}
        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1 text-white/80">
              <span>Pronósticos completados</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="bg-white/20 rounded-full h-2">
              <div
                className="bg-[#FFDF00] h-2 rounded-full transition-all"
                style={{ width: `${progress.total ? Math.min((progress.done / progress.total) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/apuestas" className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="text-2xl">⚽</div>
          <div className="text-xs font-semibold text-[#001A4B] mt-1">Apostar</div>
        </Link>
        <Link to="/matriz" className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="text-2xl">📊</div>
          <div className="text-xs font-semibold text-[#001A4B] mt-1">Matriz</div>
        </Link>
        <Link to="/ranking" className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100">
          <div className="text-2xl">🏆</div>
          <div className="text-xs font-semibold text-[#001A4B] mt-1">Ranking</div>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['partidos', 'ranking'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-[#0042A5]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'partidos' ? 'Próximos partidos' : 'Top ranking'}
          </button>
        ))}
      </div>

      {/* Tab: Partidos */}
      {activeTab === 'partidos' && (
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No hay partidos próximos</p>
          )}
          {upcoming.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              bet={bets[m.id]}
              planillaId={planilla?.id}
              onBetSaved={(b) => setBets({ ...bets, [m.id]: b })}
              onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
            />
          ))}
          {recentFinished.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-500 mt-4">Últimos resultados</h3>
              {recentFinished.map((m) => (
                <MatchCard key={m.id} match={m} bet={bets[m.id]} readonly />
              ))}
            </>
          )}
          <Link to="/apuestas" className="block text-center text-sm text-[#0042A5] hover:underline py-2">
            Ver todos los partidos →
          </Link>
        </div>
      )}

      {/* Tab: Ranking */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          {ranking.slice(0, 10).map((r, i) => (
            <div key={r.planilla_id} className={`flex items-center gap-3 px-4 py-3 ${i < ranking.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {r.position}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#001A4B] truncate">{r.user_name}</p>
                <p className="text-xs text-gray-400 truncate">{r.nombre_planilla}</p>
              </div>
              <span className="font-bold text-[#0042A5] text-sm shrink-0">{r.puntos_totales} pts</span>
            </div>
          ))}
          <Link to="/ranking" className="block text-center text-sm text-[#0042A5] hover:underline py-3 border-t border-gray-50">
            Ver ranking completo →
          </Link>
        </div>
      )}
    </div>
  )
}
