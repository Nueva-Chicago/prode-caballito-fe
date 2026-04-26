import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { useMatches } from '@/hooks/useMatches'
import { usePlanilla } from '@/hooks/usePlanilla'
import { useBets } from '@/hooks/useBets'
import { MatchCard } from '@/components/match/MatchCard'
import { Sk, SkMatchCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { POINT_COLORS } from '@/utils/scoring'

function PlanillaSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Sk className="h-6 w-6 rounded" />
        <div className="flex-1 space-y-1.5">
          <Sk className="h-6 w-40" />
          <Sk className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2">
            <Sk className="h-8 w-14" />
            <Sk className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <Sk className="h-3 w-28" />
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3].map(i => <Sk key={i} className="h-6 w-16 rounded-full" />)}
        </div>
      </div>
      <Sk className="h-9 w-48 rounded-lg" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => <SkMatchCard key={i} />)}
      </div>
    </div>
  )
}
export function Planilla() {
  const { planillaId } = useParams<{ planillaId: string }>()
  const { user } = useAuthStore()
  const t = useT()
  const [filter, setFilter] = useState<'todos' | 'pendientes' | 'finalizados'>('todos')

  const { planilla, loading: loadingPlanilla } = usePlanilla(planillaId)
  const { matches, loading: loadingMatches }   = useMatches(200)
  const { bets, setBets, refetch: refreshBets } = useBets(planillaId)

  const loading = loadingPlanilla || loadingMatches

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

  if (loading) return <PlanillaSkeleton />
  if (!planilla) return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <p className="text-gray-400">{t.planilla.notFound}</p>
      <Link to="/profile" className="text-[#00923f] text-sm hover:underline mt-2 block">{t.planilla.back}</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/profile" className="-ml-1 flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0" aria-label="Volver">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 t-text-nav" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#006d2e]">{planilla.nombre_planilla}</h1>
          <div className="flex gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planilla.precio_pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
              {planilla.precio_pagado ? t.planilla.paid : t.planilla.unpaid}
            </span>
            {!planilla.precio_pagado && (
              <span className="text-xs text-orange-500">{t.planilla.notInRanking}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#00923f]">{pts}</p>
          <p className="text-xs text-gray-400 mt-1">{t.planilla.totalPoints}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#006d2e]">{exactos}</p>
          <p className="text-xs text-gray-400 mt-1">{t.planilla.exacts}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-700">{totalBets}</p>
          <p className="text-xs text-gray-400 mt-1">{t.planilla.totalBets}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-700">{betsDone}/{pending}</p>
          <p className="text-xs text-gray-400 mt-1">{t.planilla.pendingCount}</p>
        </div>
      </div>

      {/* Distribución de puntajes */}
      {totalBets > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">{t.planilla.distribution}</p>
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
                <span>{t.planilla.pendingProgress}</span>
                <span>{betsDone}/{pending}</span>
              </div>
              <div className="bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-[#ffffff] h-1.5 rounded-full transition-all"
                  style={{ width: `${pending ? (betsDone / pending) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          ['todos',       t.planilla.all],
          ['pendientes',  t.planilla.pendingFilter],
          ['finalizados', t.planilla.finishedFilter],
        ] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === f ? 'bg-white shadow text-[#00923f]' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Partidos */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <EmptyState icon="🔍" message={t.planilla.noMatches} />
        )}
        {filtered.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            bet={bets[m.id]}
            planillaId={canEdit ? planillaId : undefined}
            onBetSaved={refreshBets}
            onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
            readonly={!canEdit}
          />
        ))}
      </div>
    </div>
  )
}
