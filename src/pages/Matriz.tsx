import { useEffect, useState, useRef } from 'react'
import { api } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { useAuthStore } from '@/store/authStore'
import type { Match, RankingEntry } from '@/types'

type BetMap = Record<string, Record<string, { home: number; away: number }>>

export function Matriz() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [loading, setLoading] = useState(true)
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get('/matches?limit=100'),
      api.get('/ranking?limit=100&include_unpaid=true'),
      api.get('/bets/all-for-matrix'),
    ]).then(([mRes, rRes, bRes]) => {
      setMatches(mRes.data.data.matches)
      setRanking(rRes.data.data.ranking)
      setBets(bRes.data.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const finishedMatches = matches.filter(m => m.estado === 'finished')
  const pendingMatches = matches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  return (
    <div className="px-2 py-4 space-y-3">
      <div className="max-w-7xl mx-auto px-2">
        <h1 className="text-xl font-bold text-[#001A4B]">📊 Matriz de Pronósticos</h1>
        <p className="text-xs text-gray-400 mt-1">
          {ranking.length} jugadores · {allMatches.length} partidos
        </p>
      </div>

      {/* Leyenda */}
      <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs">
        {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
          <span key={c} className={`px-2 py-0.5 rounded font-medium ${POINT_COLORS[c]}`}>
            {c === 'celeste' ? '4pts' : c === 'rojo' ? '3pts' : c === 'verde' ? '2pts' : c === 'amarillo' ? '1pt' : 'sin acierto'}
          </span>
        ))}
      </div>

      {/* Tabla scrolleable */}
      <div ref={tableRef} className="overflow-x-auto">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr className="bg-[#001A4B] text-white">
              <th className="sticky left-0 bg-[#001A4B] px-3 py-2 text-left font-semibold z-10 min-w-[140px]">
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
            {ranking.map((r, ri) => {
              const isMe = r.user_id === user?.id
              const playerBets = bets[r.planilla_id] || {}
              return (
                <tr key={r.planilla_id} className={`${isMe ? 'bg-blue-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50/50 transition-colors`}>
                  <td className={`sticky left-0 px-3 py-2 font-medium z-10 border-r border-gray-100 ${isMe ? 'bg-blue-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {r.position}
                      </span>
                      <span className={`truncate max-w-[100px] ${isMe ? 'text-[#0042A5] font-bold' : 'text-[#001A4B]'}`}>
                        {r.user_name}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 ml-6 truncate max-w-[100px]">{r.nombre_planilla}</div>
                  </td>
                  <td className="px-2 py-2 text-center font-black text-[#0042A5]">{r.puntos_totales}</td>
                  {allMatches.map((m) => {
                    const b = playerBets[m.id]
                    if (!b) return <td key={m.id} className="px-1 py-2 text-center text-gray-300">—</td>
                    if (m.estado === 'finished' && m.resultado_local !== undefined) {
                      const res = calcularPuntaje(
                        { goles_local: b.home, goles_visitante: b.away },
                        { resultado_local: m.resultado_local, resultado_visitante: m.resultado_visitante! }
                      )
                      return (
                        <td key={m.id} className="px-1 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[11px] ${POINT_COLORS[res.color]}`}>
                            {b.home}-{b.away}
                          </span>
                        </td>
                      )
                    }
                    return (
                      <td key={m.id} className="px-1 py-2 text-center text-gray-500 font-medium">
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
    </div>
  )
}
