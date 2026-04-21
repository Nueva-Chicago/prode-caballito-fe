import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import type { Match, Tournament } from '@/types'

type Tab = 'partidos' | 'planillas' | 'usuarios' | 'torneos' | 'broadcast'

export function Admin() {
  const { show } = useToastStore()
  const [tab, setTab] = useState<Tab>('partidos')
  const [matches, setMatches] = useState<Match[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [matchForm, setMatchForm] = useState({
    home_team: '', away_team: '', start_time: '', tournament_id: '', halftime_minutes: '15',
  })
  const [resultForm, setResultForm] = useState({ resultado_local: '', resultado_visitante: '' })
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.allSettled([
        api.get('/matches?limit=200'),
        api.get('/tournaments/admin/all'),
      ])
      if (mRes.status === 'fulfilled') setMatches(mRes.value.data.data.matches || [])
      else show('Error al cargar partidos', 'error')
      if (tRes.status === 'fulfilled') setTournaments(tRes.value.data.data || [])
      else show('Error al cargar torneos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editMatch) {
        await api.put(`/matches/${editMatch.id}`, matchForm)
        show('Partido actualizado ✓', 'success')
      } else {
        await api.post('/matches', matchForm)
        show('Partido creado ✓', 'success')
      }
      setShowMatchModal(false)
      setEditMatch(null)
      loadData()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al guardar'
      show(msg, 'error')
    }
  }

  const handleDeleteMatch = async (id: string) => {
    if (!confirm('¿Eliminar partido?')) return
    try {
      await api.delete(`/matches/${id}`)
      setMatches(matches.filter(m => m.id !== id))
      show('Partido eliminado', 'info')
    } catch {
      show('Error al eliminar', 'error')
    }
  }

  const handlePublishResult = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resultMatch) return
    try {
      await api.post(`/matches/${resultMatch.id}/result`, {
        resultado_local: parseInt(resultForm.resultado_local),
        resultado_visitante: parseInt(resultForm.resultado_visitante),
      })
      show('Resultado publicado ✓ Ranking actualizado', 'success')
      setShowResultModal(false)
      setResultMatch(null)
      loadData()
    } catch {
      show('Error al publicar resultado', 'error')
    }
  }

  const openEdit = (m: Match) => {
    setEditMatch(m)
    setMatchForm({
      home_team: m.home_team,
      away_team: m.away_team,
      start_time: m.start_time.slice(0, 16),
      tournament_id: m.tournament_id || '',
      halftime_minutes: String(m.halftime_minutes),
    })
    setShowMatchModal(true)
  }

  const openResult = (m: Match) => {
    setResultMatch(m)
    setResultForm({
      resultado_local: String(m.resultado_local ?? ''),
      resultado_visitante: String(m.resultado_visitante ?? ''),
    })
    setShowResultModal(true)
  }

  const openNewMatch = (tournamentId = '') => {
    setEditMatch(null)
    setMatchForm({ home_team: '', away_team: '', start_time: '', tournament_id: tournamentId, halftime_minutes: '15' })
    setShowMatchModal(true)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'partidos', label: '⚽ Partidos' },
    { id: 'planillas', label: '📋 Planillas' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'torneos', label: '🏆 Torneos' },
    { id: 'broadcast',   label: '📣 WhatsApp' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#001A4B]">⚙️ Administración</h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#001A4B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Partidos */}
      {tab === 'partidos' && (
        <PartidosTab
          matches={matches}
          tournaments={tournaments}
          loading={loading}
          onNewMatch={openNewMatch}
          onEdit={openEdit}
          onResult={openResult}
          onDelete={handleDeleteMatch}
        />
      )}

      {/* Tab: Torneos */}
      {tab === 'torneos' && <TorneosTab tournaments={tournaments} onRefresh={loadData} />}

      {/* Tab: Planillas y Usuarios */}
      {(tab === 'planillas' || tab === 'usuarios') && <AdminSubTab tab={tab} />}

      {/* Tab: Broadcast WhatsApp */}
      {tab === 'broadcast' && <BroadcastTab />}

      {/* Modal partido */}
      <Modal open={showMatchModal} onClose={() => setShowMatchModal(false)} title={editMatch ? 'Editar Partido' : 'Nuevo Partido'}>
        <form onSubmit={handleSaveMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipo Local</label>
              <input value={matchForm.home_team} onChange={(e) => setMatchForm({ ...matchForm, home_team: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipo Visitante</label>
              <input value={matchForm.away_team} onChange={(e) => setMatchForm({ ...matchForm, away_team: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 Fecha y hora del partido <span className="text-gray-400 font-normal">(hora local Argentina)</span></label>
            <input type="datetime-local" value={matchForm.start_time} onChange={(e) => setMatchForm({ ...matchForm, start_time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Torneo</label>
              <select value={matchForm.tournament_id} onChange={(e) => setMatchForm({ ...matchForm, tournament_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]">
                <option value="">Sin torneo</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min. cierre pronóstico</label>
              <input type="number" value={matchForm.halftime_minutes} onChange={(e) => setMatchForm({ ...matchForm, halftime_minutes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
            </div>
          </div>
          <button type="submit" className="w-full bg-[#0042A5] text-white font-bold py-2.5 rounded-xl hover:bg-[#003080]">
            {editMatch ? 'Actualizar' : 'Crear partido'}
          </button>
        </form>
      </Modal>

      {/* Modal resultado */}
      <Modal open={showResultModal} onClose={() => setShowResultModal(false)}
        title={`Resultado: ${resultMatch?.home_team} vs ${resultMatch?.away_team}`}>
        <form onSubmit={handlePublishResult} className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{resultMatch?.home_team}</label>
              <input type="number" min={0} value={resultForm.resultado_local}
                onChange={(e) => setResultForm({ ...resultForm, resultado_local: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{resultMatch?.away_team}</label>
              <input type="number" min={0} value={resultForm.resultado_visitante}
                onChange={(e) => setResultForm({ ...resultForm, resultado_visitante: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700">
            Publicar resultado y actualizar ranking
          </button>
        </form>
      </Modal>
    </div>
  )
}

/* ── PartidosTab ─────────────────────────────────────────────────────── */
interface PartidosTabProps {
  matches: Match[]
  tournaments: Tournament[]
  loading: boolean
  onNewMatch: (tournamentId: string) => void
  onEdit: (m: Match) => void
  onResult: (m: Match) => void
  onDelete: (id: string) => void
}

function PartidosTab({ matches, tournaments, loading, onNewMatch, onEdit, onResult, onDelete }: PartidosTabProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const filtered = selectedTournamentId
    ? matches.filter(m => m.tournament_id === selectedTournamentId)
    : []

  // Pantalla: selección de torneo
  if (!selectedTournamentId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Seleccioná un torneo para gestionar sus partidos</p>
        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tournaments.map(t => {
              const count = matches.filter(m => m.tournament_id === t.id).length
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournamentId(t.id)}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0042A5] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#001A4B] group-hover:text-[#0042A5]">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.fase}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {count} partidos
                    </span>
                  </div>
                </button>
              )
            })}
            {tournaments.length === 0 && (
              <p className="text-sm text-gray-400 col-span-2 text-center py-8">No hay torneos. Creá uno en la pestaña Torneos.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Pantalla: partidos del torneo seleccionado
  return (
    <div className="space-y-3">
      {/* Header con volver */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedTournamentId(null)}
          className="text-sm text-[#0042A5] hover:underline flex items-center gap-1"
        >
          ← Torneos
        </button>
        <span className="text-gray-300">|</span>
        <p className="text-sm font-semibold text-[#001A4B]">{selectedTournament?.name}</p>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{selectedTournament?.fase}</span>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{filtered.length} partidos</p>
        <button
          onClick={() => onNewMatch(selectedTournamentId)}
          className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          + Nuevo partido
        </button>
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="text-left px-4 py-2 font-semibold">Partido</th>
                <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                <th className="text-center px-4 py-2 font-semibold">Estado</th>
                <th className="text-center px-4 py-2 font-semibold">Resultado</th>
                <th className="text-right px-4 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No hay partidos en este torneo</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#001A4B]">{m.home_team}</span>
                    <span className="text-gray-400 mx-1">vs</span>
                    <span className="font-medium text-[#001A4B]">{m.away_team}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(m.start_time), "d MMM HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.estado === 'finished' ? 'bg-green-100 text-green-700' :
                      m.estado === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {m.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    {m.estado === 'finished' ? `${m.resultado_local}-${m.resultado_visitante}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => onEdit(m)} className="text-xs text-blue-600 hover:underline px-2 py-1">Editar</button>
                      {m.estado !== 'finished'
                        ? <button onClick={() => onResult(m)} className="text-xs text-green-600 hover:underline px-2 py-1">Resultado</button>
                        : <button onClick={() => onResult(m)} className="text-xs text-orange-500 hover:underline px-2 py-1">Corregir</button>
                      }
                      <button onClick={() => onDelete(m.id)} className="text-xs text-red-400 hover:underline px-2 py-1">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── TorneosTab ──────────────────────────────────────────────────────── */
type TournamentWithCount = Tournament & {
  match_count?: number
  finished_count?: number
  first_match_time?: string
  last_match_time?: string
}

function TournamentProgressBars({ t }: { t: TournamentWithCount }) {
  const now = new Date()
  const total = t.match_count ?? 0
  const finished = t.finished_count ?? 0
  const matchPct = total > 0 ? Math.round((finished / total) * 100) : 0

  // Estado de apuestas
  const firstMatch = t.first_match_time ? new Date(t.first_match_time) : null
  const lastMatch = t.last_match_time ? new Date(t.last_match_time) : null
  const startRef = t.start_date ? new Date(t.start_date) : firstMatch
  const endRef = t.end_date ? new Date(t.end_date) : lastMatch

  let betLabel = ''
  let betPct = 0
  let betColor = 'bg-green-500'
  let betStatus: 'future' | 'open' | 'closed' = 'future'

  if (!startRef) {
    betLabel = 'Sin fechas definidas'
    betStatus = 'future'
  } else if (now < startRef) {
    const totalMs = startRef.getTime() - (startRef.getTime() - 60 * 24 * 3600000)
    const elapsed = now.getTime() - (startRef.getTime() - 60 * 24 * 3600000)
    betPct = Math.max(0, Math.min(100, Math.round((elapsed / totalMs) * 100)))
    const daysLeft = Math.ceil((startRef.getTime() - now.getTime()) / (1000 * 3600 * 24))
    betLabel = `${daysLeft}d para cerrar apuestas`
    betColor = daysLeft > 30 ? 'bg-green-500' : daysLeft > 7 ? 'bg-yellow-400' : 'bg-red-500'
    betStatus = 'future'
    betPct = Math.max(5, 100 - betPct) // bar depletes as deadline approaches
  } else if (endRef && now > endRef) {
    betPct = 100
    betLabel = 'Torneo finalizado'
    betColor = 'bg-gray-400'
    betStatus = 'closed'
  } else {
    betStatus = 'open'
    if (endRef) {
      const totalMs = endRef.getTime() - startRef.getTime()
      const elapsed = now.getTime() - startRef.getTime()
      betPct = Math.round((elapsed / totalMs) * 100)
      const daysLeft = Math.ceil((endRef.getTime() - now.getTime()) / (1000 * 3600 * 24))
      betLabel = `En curso · ${daysLeft}d restantes`
    } else {
      betLabel = 'En curso'
    }
    betColor = 'bg-blue-500'
  }

  if (total === 0) return null

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Barra 1: Avance de partidos */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">⚽ Partidos</span>
          <span className="text-[10px] font-bold text-gray-600">
            {finished === total && total > 0
              ? <span className="text-green-600">✓ Todos terminados</span>
              : <>{finished}/{total} terminados</>
            }
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${finished === total && total > 0 ? 'bg-green-500' : 'bg-[#0042A5]'}`}
            style={{ width: `${matchPct}%` }}
          />
        </div>
      </div>

      {/* Barra 2: Estado de apuestas */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">⏱ Apuestas</span>
          <span className={`text-[10px] font-bold ${
            betStatus === 'closed' ? 'text-gray-400' :
            betStatus === 'open' ? 'text-blue-600' :
            betColor.includes('red') ? 'text-red-600' :
            betColor.includes('yellow') ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {betLabel}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${betColor}`}
            style={{ width: `${betStatus === 'closed' ? 100 : betPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

const EMPTY_TOURNAMENT_FORM = {
  name: '', fase: '', description: '',
  start_date: '', end_date: '', is_active: true,
}

function TorneosTab({ onRefresh }: { tournaments: Tournament[], onRefresh: () => void }) {
  const { show } = useToastStore()
  const [allTournaments, setAllTournaments] = useState<TournamentWithCount[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [createForm, setCreateForm] = useState(EMPTY_TOURNAMENT_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_TOURNAMENT_FORM)
  const [applyingCutoff, setApplyingCutoff] = useState<string | null>(null)
  const [cutoffMinutes, setCutoffMinutes] = useState<Record<string, string>>({})

  const loadAll = async () => {
    setLoadingAll(true)
    try {
      const { data } = await api.get('/tournaments/admin/all')
      setAllTournaments(data.data)
    } catch {
      show('Error al cargar torneos', 'error')
    } finally {
      setLoadingAll(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/tournaments', createForm)
      show('Torneo creado ✓', 'success')
      setCreateForm(EMPTY_TOURNAMENT_FORM)
      loadAll(); onRefresh()
    } catch {
      show('Error al crear torneo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (t: TournamentWithCount) => {
    if (editingId === t.id) { setEditingId(null); return }
    setEditingId(t.id)
    setEditForm({
      name: t.name,
      fase: t.fase,
      description: t.description || '',
      start_date: t.start_date ? t.start_date.slice(0, 10) : '',
      end_date: t.end_date ? t.end_date.slice(0, 10) : '',
      is_active: t.is_active,
    })
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      await api.put(`/tournaments/${id}`, editForm)
      show('Torneo actualizado ✓', 'success')
      setEditingId(null)
      loadAll(); onRefresh()
    } catch {
      show('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyCutoff = async (tournamentId: string) => {
    const mins = parseInt(cutoffMinutes[tournamentId] || '')
    if (isNaN(mins) || mins < 0) { show('Ingresá un número válido de minutos', 'error'); return }
    setApplyingCutoff(tournamentId)
    try {
      // Fetch matches for this tournament and update each
      const { data: mData } = await api.get('/matches?limit=500')
      const tournamentMatches = (mData.data.matches || []).filter(
        (m: Record<string, unknown>) => m.tournament_id === tournamentId
      )
      await Promise.all(
        tournamentMatches.map((m: Record<string, unknown>) =>
          api.put(`/matches/${m.id}`, { halftime_minutes: mins })
        )
      )
      show(`Cierre de ${mins} min aplicado a ${tournamentMatches.length} partidos ✓`, 'success')
    } catch {
      show('Error al aplicar cierre', 'error')
    } finally {
      setApplyingCutoff(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Formulario nuevo torneo */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-semibold text-[#001A4B] text-sm">Nuevo Torneo</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="Nombre del torneo" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          <input value={createForm.fase} onChange={(e) => setCreateForm({ ...createForm, fase: e.target.value })}
            placeholder="Fase (Grupos, Octavos...)" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
            <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
            <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50">
          Crear torneo
        </button>
      </form>

      {/* Lista de torneos */}
      <div className="space-y-2">
        {loadingAll ? (
          <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
        ) : allTournaments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay torneos</p>
        ) : allTournaments.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cabecera del torneo */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#001A4B]">{t.name}</p>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{t.fase}</span>
                  {t.match_count != null && t.match_count > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                      {t.match_count} partidos
                    </span>
                  )}
                  {t.start_date && (
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(t.start_date), "d MMM yyyy", { locale: es })}
                      {t.end_date && ` → ${format(new Date(t.end_date), "d MMM yyyy", { locale: es })}`}
                    </span>
                  )}
                </div>
                {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.is_active ? '● Activo' : '○ Inactivo'}
                </span>
                <button onClick={() => openEdit(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${editingId === t.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  {editingId === t.id ? 'Cancelar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Barras de progreso */}
            <TournamentProgressBars t={t} />

            {/* Panel de edición */}
            {editingId === t.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                    <input value={editForm.fase} onChange={(e) => setEditForm({ ...editForm, fase: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descripción opcional..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
                    <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                    <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#0042A5]" />
                    <span className="text-xs font-medium text-gray-700">Visible en la app</span>
                  </label>
                </div>

                {/* Cierre de pronósticos */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-semibold text-[#001A4B] mb-2">⏱ Cierre de pronósticos</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Establecé cuántos minutos antes del inicio se cierran los pronósticos para todos los partidos de este torneo.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={10080}
                      value={cutoffMinutes[t.id] || ''}
                      onChange={(e) => setCutoffMinutes({ ...cutoffMinutes, [t.id]: e.target.value })}
                      placeholder="ej: 45"
                      className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
                    />
                    <span className="text-xs text-gray-500">minutos antes del partido</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCutoff(t.id)}
                      disabled={applyingCutoff === t.id || !cutoffMinutes[t.id]}
                      className="text-xs bg-[#0042A5] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-[#003080] disabled:opacity-40 ml-auto"
                    >
                      {applyingCutoff === t.id ? 'Aplicando...' : 'Aplicar a todos'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => handleSaveEdit(t.id)} disabled={saving}
                    className="bg-[#0042A5] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#003080] disabled:opacity-50">
                    Guardar cambios
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AdminSubTab ─────────────────────────────────────────────────────── */
function AdminSubTab({ tab }: { tab: 'planillas' | 'usuarios' }) {
  const { show } = useToastStore()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [unlockCounts, setUnlockCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Detalle usuario
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userPlanillas, setUserPlanillas] = useState<Record<string, unknown>[]>([])
  const [loadingPlanillas, setLoadingPlanillas] = useState(false)
  const [planillaTournamentFilter, setPlanillaTournamentFilter] = useState<string>('all')
  const [allPlanillas, setAllPlanillas] = useState<Record<string, unknown>[] | null>(null)

  const loadTabData = useCallback(async () => {
    if (tab === 'usuarios') {
      const [uRes, urRes] = await Promise.allSettled([
        api.get('/users'),
        api.get('/bets/unlock-requests'),
      ])
      if (uRes.status === 'fulfilled') setData(uRes.value.data.data.users || [])
      else show('Error al cargar usuarios', 'error')
      if (urRes.status === 'fulfilled') {
        const counts: Record<string, number> = {}
        for (const r of (urRes.value.data.data || [])) {
          const uid = String(r.requester_user_id)
          counts[uid] = (counts[uid] || 0) + 1
        }
        setUnlockCounts(counts)
      }
    } else {
      const { data: d } = await api.get('/planillas/admin/all').catch(() => { show('Error al cargar', 'error'); return { data: { data: [] } } })
      setData(d.data)
    }
  }, [tab, show])

  useEffect(() => {
    setLoading(true)
    loadTabData().finally(() => setLoading(false))
    const interval = setInterval(loadTabData, 30000)
    return () => clearInterval(interval)
  }, [loadTabData])

  const handleUserClick = useCallback(async (uid: string) => {
    if (expandedUserId === uid) { setExpandedUserId(null); return }
    setExpandedUserId(uid)
    setPlanillaTournamentFilter('all')
    setLoadingPlanillas(true)
    try {
      let pl = allPlanillas
      if (!pl) {
        const { data: d } = await api.get('/planillas/admin/all')
        pl = d.data || []
        setAllPlanillas(pl)
      }
      setUserPlanillas((pl || []).filter(p => String(p.user_id) === uid))
    } catch {
      show('Error al cargar planillas', 'error')
    } finally {
      setLoadingPlanillas(false)
    }
  }, [expandedUserId, allPlanillas, show])

  const handlePaid = async (id: string, current: boolean) => {
    try {
      await api.put(`/planillas/admin/${id}`, { precio_pagado: !current })
      setData(data.map((d) => d.id === id ? { ...d, precio_pagado: !current } : d))
      show('Actualizado ✓', 'success')
    } catch {
      show('Error', 'error')
    }
  }

  if (loading) return <Spinner />

  if (tab === 'planillas') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 border-b">
              <th className="text-left px-4 py-2 font-semibold">Usuario</th>
              <th className="text-left px-4 py-2 font-semibold">Planilla</th>
              <th className="text-center px-4 py-2 font-semibold">Pts</th>
              <th className="text-center px-4 py-2 font-semibold">Pagada</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={String(p.id)} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-600 text-xs">{String(p.user_name || '')}</td>
                <td className="px-4 py-2 font-medium text-[#001A4B]">{String(p.nombre_planilla || '')}</td>
                <td className="px-4 py-2 text-center text-gray-600">{String(p.puntos_totales || 0)}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => handlePaid(String(p.id), Boolean(p.precio_pagado))}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.precio_pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                    {p.precio_pagado ? 'Pagada' : 'Sin pagar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Torneos únicos de las planillas del usuario expandido
  const userTournaments = Array.from(new Set(
    userPlanillas.map(p => String(p.tournament_name || '')).filter(Boolean)
  ))
  const filteredPlanillas = planillaTournamentFilter === 'all'
    ? userPlanillas
    : userPlanillas.filter(p => String(p.tournament_name || '') === planillaTournamentFilter)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b">
            <th className="text-left px-4 py-2 font-semibold">Nombre</th>
            <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Email</th>
            <th className="text-center px-4 py-2 font-semibold">Rol</th>
            <th className="text-center px-4 py-2 font-semibold">Verificado</th>
            <th className="text-center px-4 py-2 font-semibold">Solicitudes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => {
            const uid = String(u.id)
            const reqCount = unlockCounts[uid] || 0
            const isExpanded = expandedUserId === uid
            return (
              <>
              <tr key={uid}
                className={`border-b border-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50/50'}`}
                onClick={() => handleUserClick(uid)}
              >
                <td className="px-4 py-2 font-medium text-[#001A4B] flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  {String(u.nombre || '')}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs hidden md:table-cell">{String(u.email || '')}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {String(u.rol || '')}
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-sm">{u.email_verified ? '✅' : '❌'}</td>
                <td className="px-4 py-2 text-center">
                  {reqCount > 0
                    ? <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                        🔓 {reqCount}
                      </span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
              </tr>
              {/* Panel expandible de planillas */}
              {isExpanded && (
                <tr key={`${uid}-detail`} className="bg-blue-50/60 border-b border-blue-100">
                  <td colSpan={5} className="px-6 py-4">
                    {loadingPlanillas ? (
                      <div className="flex justify-center py-4"><Spinner /></div>
                    ) : userPlanillas.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">Este usuario no tiene planillas</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Filtro de torneos */}
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPlanillaTournamentFilter('all') }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${planillaTournamentFilter === 'all' ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200'}`}
                          >
                            Todos ({userPlanillas.length})
                          </button>
                          {userTournaments.map(t => (
                            <button
                              key={t}
                              onClick={(e) => { e.stopPropagation(); setPlanillaTournamentFilter(t) }}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${planillaTournamentFilter === t ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200'}`}
                            >
                              {t} ({userPlanillas.filter(p => String(p.tournament_name || '') === t).length})
                            </button>
                          ))}
                        </div>
                        {/* Lista de planillas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredPlanillas.map(p => (
                            <button
                              key={String(p.id)}
                              onClick={(e) => { e.stopPropagation(); navigate(`/planilla/${p.id}`) }}
                              className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-left hover:border-[#0042A5] hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-[#001A4B] group-hover:text-[#0042A5]">
                                    {String(p.nombre_planilla || 'Planilla')}
                                  </p>
                                  {p.tournament_name ? (
                                    <p className="text-xs text-gray-400 mt-0.5">{String(p.tournament_name)}</p>
                                  ) : null}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-[#0042A5]">{String(p.puntos_totales || 0)} pts</p>
                                  <p className={`text-xs font-medium mt-0.5 ${p.precio_pagado ? 'text-green-600' : 'text-orange-500'}`}>
                                    {p.precio_pagado ? 'Pagada' : 'Sin pagar'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ── BroadcastTab ────────────────────────────────────────────────────── */
function BroadcastTab() {
  const { show } = useToastStore()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null)

  const handleSend = async () => {
    if (!message.trim()) { show('Escribí un mensaje', 'error'); return }
    if (!confirm('¿Enviar este mensaje por WhatsApp a todos los usuarios que dieron su consentimiento?')) return
    setSending(true)
    setResult(null)
    try {
      const { data } = await api.post('/internal/broadcast-whatsapp', { message }, {
        headers: { 'x-internal-secret': import.meta.env.VITE_INTERNAL_SECRET || '' },
      })
      setResult(data.data)
      show(`Enviado: ${data.data.sent} ✓ / ${data.data.failed} ✗`, data.data.failed === 0 ? 'success' : 'error')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al enviar'
      show(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#001A4B] mb-1">📣 Mensaje broadcast por WhatsApp</h3>
          <p className="text-xs text-gray-400">Se enviará a todos los jugadores que tienen número de WhatsApp y dieron su consentimiento.</p>
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={"Ejemplo:\n⚽ PRODE Caballito\n\nRecordá apostar el partido de hoy antes de las 20:00 hs.\n\n👉 prodecaballito.com/apuestas"}
          rows={6}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{message.length} caracteres</span>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="t-btn-cta text-sm px-5 py-2 disabled:opacity-50"
          >
            {sending ? 'Enviando...' : '📤 Enviar a todos'}
          </button>
        </div>
        {result && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-[#001A4B]">Resultado del envío</p>
            <p className="text-gray-600">Total destinatarios: <span className="font-semibold">{result.total}</span></p>
            <p className="text-green-600">Enviados: <span className="font-semibold">{result.sent}</span></p>
            {result.failed > 0 && <p className="text-red-500">Fallidos: <span className="font-semibold">{result.failed}</span></p>}
          </div>
        )}
      </div>
    </div>
  )
}
