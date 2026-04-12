import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useAuthStore } from '@/store/authStore'
import type { Match, RankingEntry, Tournament } from '@/types'

type BetMap = Record<string, Record<string, { home: number; away: number }>>

interface TournamentRankingEntry {
  user_id: string
  user_name: string
  user_avatar?: string
  puntos: number
  posicion?: number
  position?: number
}

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
  const popRef = useRef<HTMLDivElement>(null)

  // Cerrar al click afuera
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Calcular posición: intenta abajo del badge, ajusta si se sale del viewport
  const top = cell.rect.bottom + window.scrollY + 6
  const rawLeft = cell.rect.left + window.scrollX - 60
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - 220))

  const { match, bet, result } = cell
  const isExactoLocal = bet.home === match.resultado_local
  const isExactoVisitante = bet.away === match.resultado_visitante

  const LABEL: Record<string, string> = {
    celeste:  '¡Exacto + bonus! 🔥',
    rojo:     'Exacto 🎯',
    verde:    'Parcialmente exacto',
    amarillo: 'Ganador correcto',
    gris:     'Sin puntos',
  }

  const ICON: Record<string, string> = {
    celeste: '🏆', rojo: '🎯', verde: '✅', amarillo: '👍', gris: '❌',
  }

  const color = result.color as string

  return (
    <div
      ref={popRef}
      style={{ position: 'absolute', top, left, zIndex: 9999, width: 210 }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-pop"
    >
      {/* Header con equipos */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          <span className="truncate">{match.home_team}</span>
          <span className="text-gray-300">vs</span>
          <span className="truncate text-right">{match.away_team}</span>
        </div>
        {/* Resultado real */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="text-2xl font-black text-gray-800">{match.resultado_local}</span>
          <span className="text-xs text-gray-300 font-bold">—</span>
          <span className="text-2xl font-black text-gray-800">{match.resultado_visitante}</span>
        </div>
      </div>

      {/* Detalle apuesta */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Pronóstico del usuario */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Tu pronóstico</span>
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

        {/* Puntos obtenidos */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
          color === 'celeste' ? 'bg-sky-50' :
          color === 'rojo'    ? 'bg-red-50' :
          color === 'verde'   ? 'bg-green-50' :
          color === 'amarillo'? 'bg-yellow-50' :
                                'bg-gray-50'
        }`}>
          <span className="text-xs font-semibold text-gray-600">
            {ICON[color]} {LABEL[color]}
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
            Incluye +1 bonus por exacto en partido de ≥4 goles
          </p>
        )}
      </div>
    </div>
  )
}

export function Matriz() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('all')
  const [tournamentRanking, setTournamentRanking] = useState<TournamentRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get('/matches?limit=200'),
      api.get('/ranking?limit=200&include_unpaid=true'),
      api.get('/bets/all-for-matrix'),
      api.get('/tournaments'),
    ]).then(([mRes, rRes, bRes, tRes]) => {
      setMatches(mRes.data.data.matches)
      setRanking(rRes.data.data.ranking)
      setBets(bRes.data.data)
      setTournaments(tRes.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedTournament === 'all') return
    setLoadingTournament(true)
    api.get(`/tournaments/${selectedTournament}/ranking`)
      .then(({ data }) => setTournamentRanking(data.data || []))
      .finally(() => setLoadingTournament(false))
  }, [selectedTournament])

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
    // Toggle: cerrar si ya estaba abierto el mismo
    if (activeCell?.matchId === matchId && activeCell?.rowKey === rowKey) {
      setActiveCell(null)
      return
    }
    setActiveCell({ matchId, rowKey, bet, match, result, rect })
  }, [activeCell])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const isTournamentMode = selectedTournament !== 'all'
  const filteredMatches = isTournamentMode
    ? matches.filter(m => m.tournament_id === selectedTournament)
    : matches
  const finishedMatches = filteredMatches.filter(m => m.estado === 'finished')
  const pendingMatches = filteredMatches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  const rows: RankingEntry[] = isTournamentMode
    ? tournamentRanking.map((tr, i) => ({
        planilla_id: tr.user_id,
        user_id: tr.user_id,
        user_name: tr.user_name,
        user_avatar: tr.user_avatar,
        nombre_planilla: '',
        puntos_totales: tr.puntos,
        position: tr.posicion || tr.position || i + 1,
        precio_pagado: true,
        exactos_count: 0,
        aciertos_celeste: 0,
        aciertos_rojo: 0,
        aciertos_verde: 0,
        aciertos_amarillo: 0,
        is_virtual: false,
      } as RankingEntry))
    : ranking

  const getBetsForRow = (r: RankingEntry) => {
    if (!isTournamentMode) return bets[r.planilla_id] || {}
    for (const [planillaId, planillaBets] of Object.entries(bets)) {
      const hasMatchBets = allMatches.some(m => planillaBets[m.id])
      if (hasMatchBets) {
        const rankEntry = ranking.find(rank => rank.planilla_id === planillaId && rank.user_id === r.user_id)
        if (rankEntry) return planillaBets
      }
    }
    return {}
  }

  return (
    <div className="px-2 py-4 space-y-3" onClick={() => setActiveCell(null)}>
      <style>{`
        @keyframes pop {
          0%   { opacity: 0; transform: scale(0.92) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop { animation: pop 0.15s ease-out both; }
      `}</style>

      <div className="max-w-7xl mx-auto px-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#001A4B]">📊 Matriz de Pronósticos</h1>
          <p className="text-xs text-gray-400 mt-1">
            {rows.length} jugadores · {allMatches.length} partidos
          </p>
        </div>

        {tournaments.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedTournament('all') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === 'all' ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              Global
            </button>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={(e) => { e.stopPropagation(); setSelectedTournament(t.id) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === t.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs items-center">
        {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
          <span key={c} className={`px-2 py-0.5 rounded font-medium ${POINT_COLORS[c]}`}>
            {c === 'celeste' ? '4pts' : c === 'rojo' ? '3pts' : c === 'verde' ? '2pts' : c === 'amarillo' ? '1pt' : 'sin acierto'}
          </span>
        ))}
        <span className="text-gray-400 ml-1">· Click en un resultado para ver el detalle</span>
      </div>

      {loadingTournament ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : allMatches.length === 0 ? (
        <div className="max-w-7xl mx-auto px-2 text-center py-10 text-gray-400 text-sm">
          No hay partidos en este torneo todavía
        </div>
      ) : (
        <div ref={tableRef} className="overflow-x-auto" style={{ position: 'relative' }}>
          {/* Popover */}
          {activeCell && (
            <BetPopover cell={activeCell} onClose={() => setActiveCell(null)} />
          )}

          <table className="text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-[#001A4B] text-white">
                <th className="sticky left-0 bg-[#001A4B] px-3 py-2 text-left font-semibold z-10 min-w-[180px]">
                  Jugador
                </th>
                <th className="px-2 py-2 text-center font-semibold w-14">Pts</th>
                {allMatches.map((m) => (
                  <th key={m.id} className="px-1 py-2 text-center font-medium min-w-[60px]">
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
                const playerBets = isTournamentMode ? getBetsForRow(r) : (bets[r.planilla_id] || {})
                const rowBg = isMe ? 'bg-blue-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                const rowKey = `${r.planilla_id}-${ri}`
                return (
                  <tr key={rowKey} className={`${rowBg} hover:bg-yellow-50/50 transition-colors`}>
                    <td className={`sticky left-0 px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {r.position}
                        </span>
                        {r.user_avatar
                          ? <img src={r.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100" />
                          : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-300 text-gray-600'}`}>
                              {r.user_name[0].toUpperCase()}
                            </div>
                        }
                        <div className="min-w-0">
                          <div className={`truncate max-w-[105px] font-semibold ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                            {r.user_name}
                          </div>
                          {r.nombre_planilla && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[105px]">{r.nombre_planilla}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center font-black text-[#0042A5]">{r.puntos_totales}</td>
                    {allMatches.map((m) => {
                      const b = playerBets[m.id]
                      if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                      if (m.estado === 'finished' && m.resultado_local !== undefined) {
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
                              `}
                            >
                              {b.home}-{b.away}
                            </span>
                          </td>
                        )
                      }
                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center text-gray-500 font-medium">
                          {b.home}-{b.away}
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
    </div>
  )
}
