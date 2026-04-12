import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import { useTeamBadgesStore } from '@/store/teamBadgesStore'
import { teamFlag } from '@/utils/teamFlags'
import type { Match, Tournament } from '@/types'

type Tab = 'partidos' | 'planillas' | 'usuarios' | 'torneos' | 'desbloqueos' | 'escudos'

interface UnlockRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  requester_name: string
  requester_email: string
  target_name: string
  home_team: string
  away_team: string
  start_time: string
  created_at: string
}

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
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([])
  const [loadingUnlocks, setLoadingUnlocks] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (tab === 'desbloqueos') loadUnlockRequests() }, [tab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/tournaments/admin/all'),
      ])
      setMatches(mRes.data.data.matches)
      setTournaments(tRes.data.data)
    } catch {
      show('Error al cargar datos', 'error')
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

  const loadUnlockRequests = async () => {
    setLoadingUnlocks(true)
    try {
      const res = await api.get('/bets/unlock-requests')
      setUnlockRequests(res.data.data || [])
    } catch {
      show('Error al cargar solicitudes', 'error')
    } finally {
      setLoadingUnlocks(false)
    }
  }

  const handleApproveUnlock = async (id: string) => {
    try {
      await api.put(`/bets/unlock-requests/${id}/approve`)
      show('Solicitud aprobada ✓', 'success')
      setUnlockRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r))
    } catch {
      show('Error al aprobar', 'error')
    }
  }

  const handleRejectUnlock = async (id: string) => {
    try {
      await api.put(`/bets/unlock-requests/${id}/reject`)
      show('Solicitud rechazada', 'info')
      setUnlockRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r))
    } catch {
      show('Error al rechazar', 'error')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'partidos', label: '⚽ Partidos' },
    { id: 'planillas', label: '📋 Planillas' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'torneos', label: '🏆 Torneos' },
    { id: 'desbloqueos', label: '🔓 Desbloqueos' },
    { id: 'escudos',     label: '🛡️ Escudos' },
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

      {/* Tab: Desbloqueos */}
      {tab === 'desbloqueos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {unlockRequests.filter(r => r.status === 'pending').length} solicitudes pendientes
            </p>
            <button onClick={loadUnlockRequests} className="text-xs text-[#0042A5] font-medium hover:underline">
              Actualizar
            </button>
          </div>
          {loadingUnlocks ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : unlockRequests.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No hay solicitudes</div>
          ) : (
            <div className="space-y-2">
              {unlockRequests.map((r) => (
                <div key={r.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${r.status === 'pending' ? 'border-orange-200' : 'border-gray-100'}`}>
                  <div className="text-xl shrink-0">{r.status === 'pending' ? '⏳' : r.status === 'approved' ? '✅' : '❌'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#001A4B]">
                      {r.requester_name}
                      <span className="font-normal text-gray-400"> quiere ver apuesta de </span>
                      {r.target_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.home_team} vs {r.away_team}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(r.created_at), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveUnlock(r.id)}
                        className="text-xs bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectUnlock(r.id)}
                        className="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {r.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Escudos */}
      {tab === 'escudos' && <EscudosTab matches={matches} />}

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
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha y hora</label>
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
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? matches
    : filter === 'none'
      ? matches.filter(m => !m.tournament_id)
      : matches.filter(m => m.tournament_id === filter)

  const filterOptions = [
    { id: 'all', label: `Todos`, count: matches.length },
    ...tournaments.map(t => ({
      id: t.id,
      label: t.name,
      count: matches.filter(m => m.tournament_id === t.id).length,
    })),
    ...(matches.some(m => !m.tournament_id)
      ? [{ id: 'none', label: 'Sin torneo', count: matches.filter(m => !m.tournament_id).length }]
      : []),
  ]

  return (
    <div className="space-y-3">
      {/* Filtros por torneo */}
      <div className="flex gap-1.5 flex-wrap">
        {filterOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === opt.id
                ? 'bg-[#001A4B] text-white border-[#001A4B]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {opt.label}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              filter === opt.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {opt.count}
            </span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{filtered.length} partidos</p>
        <button
          onClick={() => onNewMatch(filter !== 'all' && filter !== 'none' ? filter : '')}
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
                <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Fecha</th>
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
                    {filter === 'all' && m.tournament_name && (
                      <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.tournament_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
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
function TorneosTab({ onRefresh }: { tournaments: Tournament[], onRefresh: () => void }) {
  const { show } = useToastStore()
  const [allTournaments, setAllTournaments] = useState<(Tournament & { match_count?: number })[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [form, setForm] = useState({ name: '', fase: '', description: '' })
  const [saving, setSaving] = useState(false)

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
      await api.post('/tournaments', form)
      show('Torneo creado ✓', 'success')
      setForm({ name: '', fase: '', description: '' })
      loadAll(); onRefresh()
    } catch {
      show('Error al crear torneo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t: Tournament) => {
    try {
      await api.put(`/tournaments/${t.id}`, { is_active: !t.is_active })
      show(`Torneo ${!t.is_active ? 'activado' : 'desactivado'} ✓`, 'success')
      loadAll(); onRefresh()
    } catch {
      show('Error', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-semibold text-[#001A4B] text-sm">Nuevo Torneo</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre del torneo" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          <input value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}
            placeholder="Fase (Grupos, Octavos...)" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50">
          Crear torneo
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500">Todos los torneos · activá/desactivá para que aparezcan en la app</p>
        </div>
        {loadingAll ? (
          <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
        ) : allTournaments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay torneos</p>
        ) : allTournaments.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#001A4B]">{t.name}</p>
                {t.match_count != null && t.match_count > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                    {t.match_count} partidos
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{t.fase}</p>
            </div>
            <button onClick={() => handleToggle(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                t.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {t.is_active ? '● Activo' : '○ Inactivo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AdminSubTab ─────────────────────────────────────────────────────── */
function AdminSubTab({ tab }: { tab: 'planillas' | 'usuarios' }) {
  const { show } = useToastStore()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = tab === 'planillas' ? '/planillas/admin/all' : '/users'
    api.get(url).then(({ data: d }) => {
      setData(tab === 'planillas' ? d.data : d.data.users)
    }).catch(() => show('Error al cargar', 'error')).finally(() => setLoading(false))
  }, [tab])

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b">
            <th className="text-left px-4 py-2 font-semibold">Nombre</th>
            <th className="text-left px-4 py-2 font-semibold">Email</th>
            <th className="text-center px-4 py-2 font-semibold">Rol</th>
            <th className="text-center px-4 py-2 font-semibold">Verificado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={String(u.id)} className="border-b border-gray-50">
              <td className="px-4 py-2 font-medium text-[#001A4B]">{String(u.nombre || '')}</td>
              <td className="px-4 py-2 text-gray-500 text-xs">{String(u.email || '')}</td>
              <td className="px-4 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {String(u.rol || '')}
                </span>
              </td>
              <td className="px-4 py-2 text-center text-sm">{u.email_verified ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── EscudosTab ──────────────────────────────────────────────────────── */
function EscudosTab({ matches }: { matches: Match[] }) {
  const { show } = useToastStore()
  const { badges, setBadge, removeBadge } = useTeamBadgesStore()
  const [editTeam, setEditTeam] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [newTeam, setNewTeam] = useState('')
  const [newUrl, setNewUrl] = useState('')

  // Equipos únicos de todos los partidos
  const teams = Array.from(new Set(
    matches.flatMap(m => [m.home_team, m.away_team])
  )).sort()

  const teamsWithBadge = teams.filter(t => badges[t.toUpperCase().trim()])
  const teamsWithoutBadge = teams.filter(t => !badges[t.toUpperCase().trim()])

  const handleSave = async (teamName: string, url: string) => {
    if (!url.trim()) return
    setSaving(true)
    try {
      await api.put ? api.post('/teams/badges', { team_name: teamName, badge_url: url }) : null
      await api.post('/teams/badges', { team_name: teamName, badge_url: url })
      setBadge(teamName, url)
      show(`Escudo de ${teamName} guardado ✓`, 'success')
      setEditTeam(null)
      setNewTeam('')
      setNewUrl('')
    } catch {
      show('Error al guardar escudo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (teamName: string) => {
    try {
      await api.delete(`/teams/badges/${encodeURIComponent(teamName)}`)
      removeBadge(teamName)
      show('Escudo eliminado', 'info')
    } catch {
      show('Error al eliminar', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Agregar nuevo escudo manual */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#001A4B]">Agregar escudo manualmente</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            value={newTeam}
            onChange={e => setNewTeam(e.target.value)}
            placeholder="Nombre del equipo (ej: Brazil)"
            className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
          />
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="URL del escudo (https://...)"
            className="flex-1 min-w-52 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
          />
          {newUrl && (
            <img src={newUrl} alt="" className="w-10 h-10 object-contain rounded border border-gray-200"
              onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <button
            onClick={() => handleSave(newTeam, newUrl)}
            disabled={saving || !newTeam || !newUrl}
            className="bg-[#001A4B] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#002870] disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Equipos sin escudo */}
      {teamsWithoutBadge.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
            <p className="text-xs font-semibold text-orange-700">Sin escudo ({teamsWithoutBadge.length})</p>
          </div>
          {teamsWithoutBadge.map(team => (
            <div key={team} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-lg w-8 text-center">{teamFlag(team) || '🏳️'}</span>
              <span className="flex-1 text-sm font-medium text-gray-700">{team}</span>
              {editTeam === team ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="URL del escudo..."
                    autoFocus
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-[#0042A5]"
                  />
                  {urlInput && (
                    <img src={urlInput} alt="" className="w-8 h-8 object-contain rounded border"
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                  <button onClick={() => handleSave(team, urlInput)} disabled={saving}
                    className="text-xs bg-green-600 text-white font-bold px-2 py-1 rounded-lg">✓</button>
                  <button onClick={() => setEditTeam(null)}
                    className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-lg">✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditTeam(team); setUrlInput('') }}
                  className="text-xs bg-[#0042A5] text-white font-bold px-3 py-1 rounded-lg hover:bg-[#003080]">
                  + Agregar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Equipos con escudo */}
      {teamsWithBadge.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2 bg-green-50 border-b border-green-100">
            <p className="text-xs font-semibold text-green-700">Con escudo ({teamsWithBadge.length})</p>
          </div>
          {teamsWithBadge.map(team => (
            <div key={team} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
              <img src={badges[team.toUpperCase().trim()]} alt={team}
                className="w-8 h-8 object-contain rounded border border-gray-100" />
              <span className="flex-1 text-sm font-medium text-gray-700">{team}</span>
              <button onClick={() => handleDelete(team)}
                className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-200">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
