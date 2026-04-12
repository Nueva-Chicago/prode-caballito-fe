import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import type { Match, Tournament } from '@/types'

type Tab = 'partidos' | 'planillas' | 'usuarios' | 'torneos'

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
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/tournaments'),
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'partidos', label: '⚽ Partidos' },
    { id: 'planillas', label: '📋 Planillas' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'torneos', label: '🏆 Torneos' },
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
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{matches.length} partidos</p>
            <button onClick={() => { setEditMatch(null); setMatchForm({ home_team: '', away_team: '', start_time: '', tournament_id: '', halftime_minutes: '15' }); setShowMatchModal(true) }}
              className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors">
              + Nuevo partido
            </button>
          </div>
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
                  {matches.map((m) => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#001A4B]">{m.home_team}</span>
                        <span className="text-gray-400 mx-1">vs</span>
                        <span className="font-medium text-[#001A4B]">{m.away_team}</span>
                        {m.tournament_name && <span className="ml-2 text-xs text-gray-400">[{m.tournament_name}]</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                        {format(new Date(m.start_time), "d MMM HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.estado === 'finished' ? 'bg-green-100 text-green-700' : m.estado === 'live' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                          {m.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {m.estado === 'finished' ? `${m.resultado_local}-${m.resultado_visitante}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline px-2 py-1">Editar</button>
                          {m.estado !== 'finished'
                            ? <button onClick={() => openResult(m)} className="text-xs text-green-600 hover:underline px-2 py-1">Resultado</button>
                            : <button onClick={() => openResult(m)} className="text-xs text-orange-500 hover:underline px-2 py-1">Corregir</button>
                          }
                          <button onClick={() => handleDeleteMatch(m.id)} className="text-xs text-red-400 hover:underline px-2 py-1">×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Torneos */}
      {tab === 'torneos' && <TorneosTab tournaments={tournaments} onRefresh={loadData} />}

      {/* Tab: Planillas y Usuarios — placeholder */}
      {(tab === 'planillas' || tab === 'usuarios') && (
        <AdminSubTab tab={tab} />
      )}

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

function TorneosTab({ tournaments, onRefresh }: { tournaments: Tournament[], onRefresh: () => void }) {
  const { show } = useToastStore()
  const [form, setForm] = useState({ name: '', fase: '', description: '' })
  const [saving, setSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/tournaments', form)
      show('Torneo creado ✓', 'success')
      setForm({ name: '', fase: '', description: '' })
      onRefresh()
    } catch {
      show('Error al crear torneo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t: Tournament) => {
    try {
      await api.put(`/tournaments/${t.id}`, { is_active: !t.is_active })
      onRefresh()
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
        {tournaments.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No hay torneos</p>}
        {tournaments.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-[#001A4B]">{t.name}</p>
              <p className="text-xs text-gray-400">{t.fase}</p>
            </div>
            <button onClick={() => handleToggle(t)}
              className={`text-xs px-3 py-1 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {t.is_active ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

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
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{String(u.rol || '')}</span>
              </td>
              <td className="px-4 py-2 text-center text-sm">{u.email_verified ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
