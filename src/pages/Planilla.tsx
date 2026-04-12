import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { MatchCard } from '@/components/match/MatchCard'
import { Spinner } from '@/components/ui/Spinner'
import { POINT_COLORS } from '@/utils/scoring'
import type { Match, Bet, Planilla as PlanillaType } from '@/types'

export function Planilla() {
  const { planillaId } = useParams<{ planillaId: string }>()
  const { user } = useAuthStore()
  const [planilla, setPlanilla] = useState<PlanillaType | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'finalizados'>('todos')

  useEffect(() => {
    if (!planillaId) return
    loadData()
  }, [planillaId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [planRes, matchRes, betRes] = await Promise.all([
        api.get(`/planillas/${planillaId}`),
        api.get('/matches?limit=200'),
        api.get(`/bets/planillas/${planillaId}/bets?t=${Date.now()}`),
      ])
      setPlanilla(planRes.data.data)
      setMatches(matchRes.data.data.matches)
      const betMap: Record<string, Bet> = {}
      for (const b of betRes.data.data) betMap[b.match_id] = b
      setBets(betMap)
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false)
    }
  }

  const isOwner = planilla?.user_id === user?.id
  const isAdmin = user?.rol === 'admin'
  const canEdit = isOwner || isAdmin

  const filtered = matches.filter((m) => {
    if (filter === 'pendientes') return m.estado !== 'finished'
    if (filter === 'finalizados') return m.estado === 'finished'
    return true
  })

  const totalBets = Object.keys(bets).length
  const pending = matches.filter(m => m.estado !== 'finished').length
  const betsDone = matches.filter(m => m.estado !== 'finished' && bets[m.id]).length
  const pts = planilla?.puntos_totales || 0
  const exactos = planilla?.exactos_count || 0

  // Distribucion de puntajes
  const dist = { celeste: 0, rojo: 0, verde: 0, amarillo: 0, gris: 0 }
  for (const b of Object.values(bets)) {
    if (b.puntos_obtenidos === 4) dist.celeste++
    else if (b.puntos_obtenidos === 3) dist.rojo++
    else if (b.puntos_obtenidos === 2) dist.verde++
    else if (b.puntos_obtenidos === 1) dist.amarillo++
    else if (b.puntos_obtenidos === 0) dist.gris++
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!planilla) return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <p className="text-gray-400">Planilla no encontrada</p>
      <Link to="/profile" className="text-[#0042A5] text-sm hover:underline mt-2 block">← Volver al perfil</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/profile" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#001A4B]">{planilla.nombre_planilla}</h1>
          <div className="flex gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planilla.precio_pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
              {planilla.precio_pagado ? '✓ Pagada' : 'Sin pagar'}
            </span>
            {!planilla.precio_pagado && (
              <span className="text-xs text-orange-500">· No aparece en el ranking oficial</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#0042A5]">{pts}</p>
          <p className="text-xs text-gray-400 mt-1">Puntos totales</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#001A4B]">{exactos}</p>
          <p className="text-xs text-gray-400 mt-1">Exactos (≥3pts)</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-700">{totalBets}</p>
          <p className="text-xs text-gray-400 mt-1">Total pronósticos</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-700">{betsDone}/{pending}</p>
          <p className="text-xs text-gray-400 mt-1">Pendientes</p>
        </div>
      </div>

      {/* Distribución de puntajes */}
      {totalBets > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">Distribución de puntajes</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(dist) as [keyof typeof dist, number][]).map(([color, count]) =>
              count > 0 ? (
                <span key={color} className={`text-xs font-bold px-2.5 py-1 rounded-full ${POINT_COLORS[color]}`}>
                  {count}× {color === 'celeste' ? '4pts' : color === 'rojo' ? '3pts' : color === 'verde' ? '2pts' : color === 'amarillo' ? '1pt' : '0pts'}
                </span>
              ) : null
            )}
          </div>
          {/* Barra de progreso de pronósticos */}
          {pending > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Partidos pendientes completados</span>
                <span>{betsDone}/{pending}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-[#FFDF00] h-1.5 rounded-full transition-all"
                  style={{ width: `${pending ? (betsDone / pending) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['todos', 'pendientes', 'finalizados'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'bg-white shadow text-[#0042A5]' : 'text-gray-500'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Partidos */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-10">No hay partidos en esta categoría</p>
        )}
        {filtered.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            bet={bets[m.id]}
            planillaId={canEdit ? planillaId : undefined}
            onBetSaved={(b) => setBets({ ...bets, [m.id]: b })}
            onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
            readonly={!canEdit}
          />
        ))}
      </div>
    </div>
  )
}
