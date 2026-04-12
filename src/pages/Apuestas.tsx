import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { MatchCard } from '@/components/match/MatchCard'
import { Spinner } from '@/components/ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import type { Match, Bet, Planilla } from '@/types'

export function Apuestas() {
  const { show } = useToastStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [selectedPlanilla, setSelectedPlanilla] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'finalizados'>('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (selectedPlanilla) loadBets(selectedPlanilla)
  }, [selectedPlanilla])

  const loadInitial = async () => {
    setLoading(true)
    try {
      const [matchRes, planRes] = await Promise.all([
        api.get('/matches?limit=100'),
        api.get('/planillas'),
      ])
      setMatches(matchRes.data.data.matches)
      const pl: Planilla[] = planRes.data.data
      setPlanillas(pl)
      if (pl.length > 0) {
        setSelectedPlanilla(pl[0].id)
      }
    } catch {
      show('Error al cargar partidos', 'error')
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
      show('Error al cargar pronósticos', 'error')
    }
  }

  const filtered = matches.filter((m) => {
    if (filter === 'pendientes' && m.estado === 'finished') return false
    if (filter === 'finalizados' && m.estado !== 'finished') return false
    if (search) {
      const q = search.toLowerCase()
      return m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
    }
    return true
  })

  const progress = {
    done: Object.keys(bets).length,
    total: matches.filter(m => m.estado !== 'finished').length
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#001A4B]">Pronósticos</h1>
        <span className="text-sm text-gray-500">{progress.done}/{progress.total} completados</span>
      </div>

      {/* Selector de planilla */}
      {planillas.length > 1 && (
        <select
          value={selectedPlanilla}
          onChange={(e) => setSelectedPlanilla(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
        >
          {planillas.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre_planilla}</option>
          ))}
        </select>
      )}

      {planillas.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          No tenés planillas. Creá una desde tu perfil para poder apostar.
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['todos', 'pendientes', 'finalizados'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white shadow text-[#0042A5]' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipo..."
          className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0042A5]"
        />
      </div>

      {/* Lista de partidos */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-10">No hay partidos en esta categoría</p>
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
