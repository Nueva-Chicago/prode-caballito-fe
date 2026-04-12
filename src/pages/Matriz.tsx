import { useEffect, useState, useRef } from 'react'
import { api } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
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

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const isTournamentMode = selectedTournament !== 'all'

  // Filtrar partidos según el modo
  const filteredMatches = isTournamentMode
    ? matches.filter(m => m.tournament_id === selectedTournament)
    : matches

  const finishedMatches = filteredMatches.filter(m => m.estado === 'finished')
  const pendingMatches = filteredMatches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  // En modo torneo usar tournamentRanking, sino el global
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

  // En modo torneo las apuestas se buscan por planilla del usuario (primer planilla encontrada)
  // El BetMap ya tiene todas las apuestas, filtramos por matches del torneo
  const getBetsForRow = (r: RankingEntry) => {
    if (!isTournamentMode) return bets[r.planilla_id] || {}
    // Buscar en todas las planillas del usuario cuál tiene apuestas para estos partidos
    for (const [planillaId, planillaBets] of Object.entries(bets)) {
      const hasMatchBets = allMatches.some(m => planillaBets[m.id])
      if (hasMatchBets) {
        // Verificar si esta planilla pertenece al usuario correcto
        // Como no tenemos esa info directamente, usamos la primera planilla con apuestas que coincida
        // con el ranking global
        const rankEntry = ranking.find(rank => rank.planilla_id === planillaId && rank.user_id === r.user_id)
        if (rankEntry) return planillaBets
      }
    }
    return {}
  }

  return (
    <div className="px-2 py-4 space-y-3">
      <div className="max-w-7xl mx-auto px-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#001A4B]">📊 Matriz de Pronósticos</h1>
          <p className="text-xs text-gray-400 mt-1">
            {rows.length} jugadores · {allMatches.length} partidos
          </p>
        </div>

        {/* Selector torneo */}
        {tournaments.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedTournament('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === 'all' ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              Global
            </button>
            {tournaments.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTournament(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedTournament === t.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs">
        {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
          <span key={c} className={`px-2 py-0.5 rounded font-medium ${POINT_COLORS[c]}`}>
            {c === 'celeste' ? '4pts' : c === 'rojo' ? '3pts' : c === 'verde' ? '2pts' : c === 'amarillo' ? '1pt' : 'sin acierto'}
          </span>
        ))}
      </div>

      {loadingTournament ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : allMatches.length === 0 ? (
        <div className="max-w-7xl mx-auto px-2 text-center py-10 text-gray-400 text-sm">
          No hay partidos en este torneo todavía
        </div>
      ) : (
        /* Tabla scrolleable */
        <div ref={tableRef} className="overflow-x-auto">
          <table className="text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-[#001A4B] text-white">
                <th className="sticky left-0 bg-[#001A4B] px-3 py-2 text-left font-semibold z-10 min-w-[180px]">
                  Jugador
                </th>
                <th className="px-2 py-2 text-center font-semibold w-14">Pts</th>
                {allMatches.map((m) => (
                  <th key={m.id} className="px-1 py-2 text-center font-medium min-w-[60px]">
                    <div className="truncate max-w-[55px]">{m.home_team.substring(0,3).toUpperCase()}</div>
                    <div className="text-[10px] text-white/60">vs</div>
                    <div className="truncate max-w-[55px]">{m.away_team.substring(0,3).toUpperCase()}</div>
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
                return (
                  <tr key={`${r.planilla_id}-${ri}`} className={`${rowBg} hover:bg-yellow-50/50 transition-colors`}>
                    <td className={`sticky left-0 px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg}`}>
                      <div className="flex items-center gap-2">
                        {/* Posición */}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {r.position}
                        </span>
                        {/* Avatar */}
                        {r.user_avatar
                          ? <img src={r.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100" />
                          : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-300 text-gray-600'}`}>
                              {r.user_name[0].toUpperCase()}
                            </div>
                        }
                        {/* Nombre + planilla */}
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
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[11px] ${POINT_COLORS[res.color]}`}>
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
