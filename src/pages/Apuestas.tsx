import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { MatchCard } from '@/components/match/MatchCard'
import { Spinner } from '@/components/ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import type { Match, Bet, Planilla, Tournament } from '@/types'

export function Apuestas() {
  const { show } = useToastStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedPlanilla, setSelectedPlanilla] = useState<string>('')
  const [selectedTournament, setSelectedTournament] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'finalizados'>('todos')
  const [search, setSearch] = useState('')
  const [showNewPlanilla, setShowNewPlanilla] = useState(false)
  const [newPlanillaName, setNewPlanillaName] = useState('')
  const [creatingPlanilla, setCreatingPlanilla] = useState(false)

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (selectedPlanilla) loadBets(selectedPlanilla)
  }, [selectedPlanilla])

  const loadInitial = async () => {
    setLoading(true)
    try {
      const [matchRes, planRes, tourRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/tournaments').catch(() => ({ data: { data: [] } })),
      ])
      setMatches(matchRes.data.data.matches)
      setTournaments(tourRes.data.data || [])
      const pl: Planilla[] = planRes.data.data
      setPlanillas(pl)
      if (pl.length > 0) {
        setSelectedPlanilla(pl[0].id)
      }
    } catch {
      show(t.bets.errorLoadMatches, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadBets = async (planillaId: string) => {
    try {
      const { data } = await api.get(`/bets/planillas/${planillaId}/bets?t=${Date.now()}`)
      const betMap: Record<string, Bet> = {}
      for (const b of data.data) betMap[b.match_id] = b
      setBets(betMap)
    } catch {
      show(t.bets.errorLoad, 'error')
    }
  }

  const handleCreatePlanilla = async () => {
    if (!newPlanillaName.trim()) return
    setCreatingPlanilla(true)
    try {
      const { data } = await api.post('/planillas', { nombre_planilla: newPlanillaName.trim() })
      const created: Planilla = data.data
      setPlanillas(prev => [...prev, created])
      setSelectedPlanilla(created.id)
      setBets({})
      setNewPlanillaName('')
      setShowNewPlanilla(false)
      show(t.bets.planillaCreated(created.nombre_planilla), 'success')
    } catch {
      show(t.bets.errorCreate, 'error')
    } finally {
      setCreatingPlanilla(false)
    }
  }

  const tournamentMatches = selectedTournament === 'all'
    ? matches
    : matches.filter(m => m.tournament_id === selectedTournament)

  const pendingMatches = tournamentMatches.filter(m => m.estado !== 'finished')

  const filtered = tournamentMatches.filter((m) => {
    if (filter === 'pendientes' && m.estado === 'finished') return false
    if (filter === 'finalizados' && m.estado !== 'finished') return false
    if (search) {
      const q = search.toLowerCase()
      return m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
    }
    return true
  })

  const progress = {
    done: Object.keys(bets).filter(mid => tournamentMatches.find(m => m.id === mid)).length,
    total: pendingMatches.length,
  }

  const selectedTournamentName = tournaments.find(tour => tour.id === selectedTournament)?.name
  // Disabled si el torneo seleccionado no tiene ninguna apuesta propia (ni partidos ni pronósticos)
  const noBeetsInTournament = selectedTournament !== 'all'
    && (tournamentMatches.length === 0 || !tournamentMatches.some(m => bets[m.id]))

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#001A4B]">{t.bets.title}</h1>
        <span className="text-sm text-gray-400">{progress.done}/{progress.total} {t.bets.completed}</span>
      </div>

      {/* Selector de planilla + crear nueva */}
      <div className="flex gap-2 items-center">
        {planillas.length > 0 ? (
          <div className="relative flex-1">
            <select
              value={selectedPlanilla}
              onChange={(e) => setSelectedPlanilla(e.target.value)}
              disabled={noBeetsInTournament}
              className={`w-full appearance-none border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5] pr-8 font-medium transition-all ${
                noBeetsInTournament
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                  : 'border-gray-200 t-text-nav'
              }`}
            >
              {planillas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_planilla}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
          </div>
        ) : (
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800 font-medium">
            {t.bets.noPlanillas}
          </div>
        )}
        <button
          onClick={() => {
            if (noBeetsInTournament && selectedTournamentName) {
              setNewPlanillaName(selectedTournamentName)
            }
            setShowNewPlanilla(true)
          }}
          className="shrink-0 w-10 h-10 rounded-xl t-bg-primary text-white font-bold text-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          title={t.bets.newPlanilla}
        >
          +
        </button>
      </div>

      {/* Banner: torneo sin planilla activa */}
      {noBeetsInTournament && planillas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl shrink-0">📋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">
              {t.bets.noBeetsTitle(selectedTournamentName || '')}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {t.bets.noBeetsDesc}
            </p>
          </div>
          <button
            onClick={() => {
              setNewPlanillaName(selectedTournamentName || '')
              setShowNewPlanilla(true)
            }}
            className="shrink-0 t-btn-primary text-xs px-3 py-2"
          >
            {t.bets.new}
          </button>
        </div>
      )}

      {/* Modal nueva planilla */}
      {showNewPlanilla && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowNewPlanilla(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6"
            style={{ animation: 'slideUp 0.2s ease-out both' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <h3 className="font-bold t-text-nav text-base mb-1">{t.bets.newPlanilla}</h3>
            <p className="text-xs text-gray-400 mb-4">
              {t.bets.planillaIndependent}
            </p>
            <input
              type="text"
              value={newPlanillaName}
              onChange={(e) => setNewPlanillaName(e.target.value)}
              placeholder={t.bets.planillaPlaceholder}
              autoFocus
              maxLength={40}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlanilla()}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewPlanilla(false); setNewPlanillaName('') }}
                className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl"
              >
                {t.bets.cancel}
              </button>
              <button
                onClick={handleCreatePlanilla}
                disabled={!newPlanillaName.trim() || creatingPlanilla}
                className="flex-1 t-btn-primary text-sm py-3 disabled:opacity-40"
              >
                {creatingPlanilla ? '...' : t.bets.createPlanilla}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Selector de torneo */}
      {tournaments.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedTournament('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === 'all' ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            {t.bets.all}
          </button>
          {tournaments.map(tour => (
            <button
              key={tour.id}
              onClick={() => setSelectedTournament(tour.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === tour.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              {tour.name}
            </button>
          ))}
        </div>
      )}

      {/* Filtros + búsqueda */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {([
            { key: 'todos',       label: t.bets.all },
            { key: 'pendientes',  label: t.bets.pending },
            { key: 'finalizados', label: t.bets.finished },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === key ? 'bg-white shadow text-[#0042A5]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.bets.searchTeam}
          className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0042A5] bg-white"
        />
      </div>

      {/* Lista de partidos */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-10">{t.bets.noMatches}</p>
        )}
        {filtered.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            bet={bets[m.id]}
            planillaId={selectedPlanilla || undefined}
            onBetSaved={(b) => setBets({ ...bets, [m.id]: b })}
            onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
          />
        ))}
      </div>
    </div>
  )
}
