import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje } from '@/utils/scoring'
import type { RankingEntry, Tournament, Match } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']

type BetEntry = { home: number; away: number }
type BetMap = Record<string, Record<string, BetEntry>> // planilla_id → match_id → bet

export function Ranking() {
  const { user } = useAuthStore()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')  // '' = global
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RankingEntry | null>(null)
  const [shared, setShared] = useState(false)

  // Datos para ranking por torneo (cargados lazy)
  const [bets, setBets] = useState<BetMap | null>(null)
  const [allMatches, setAllMatches] = useState<Match[] | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      api.get('/ranking?limit=200'),
      api.get('/tournaments'),
    ]).then(([rRes, tRes]) => {
      if (rRes.status === 'fulfilled') setRanking(rRes.value.data.data.ranking || [])
      if (tRes.status === 'fulfilled') setTournaments(tRes.value.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  // Cargar bets+matches la primera vez que se selecciona un torneo
  useEffect(() => {
    if (!selectedTournamentId || bets !== null) return
    setLoadingTournament(true)
    Promise.allSettled([
      api.get('/bets/all-for-matrix'),
      api.get('/matches?limit=500'),
    ]).then(([bRes, mRes]) => {
      if (bRes.status === 'fulfilled') setBets(bRes.value.data.data || {})
      if (mRes.status === 'fulfilled') setAllMatches(mRes.value.data.data.matches || [])
    }).finally(() => setLoadingTournament(false))
  }, [selectedTournamentId, bets])

  // Ranking por torneo calculado client-side
  const tournamentRanking = useMemo(() => {
    if (!selectedTournamentId || !bets || !allMatches) return null

    const tournamentMatches = allMatches.filter(m => m.tournament_id === selectedTournamentId)
    const finishedMatches = tournamentMatches.filter(
      m => m.estado === 'finished' && m.resultado_local != null && m.resultado_visitante != null
    )

    const pts = new Map<string, number>()
    const exactos = new Map<string, number>()

    ranking.forEach(r => {
      const playerBets = bets[r.planilla_id] || {}
      let totalPts = 0
      let totalExactos = 0
      finishedMatches.forEach(m => {
        const b = playerBets[m.id]
        if (!b) return
        const res = calcularPuntaje(
          { goles_local: b.home, goles_visitante: b.away },
          { resultado_local: m.resultado_local!, resultado_visitante: m.resultado_visitante! }
        )
        totalPts += res.puntos
        if (res.color === 'red') totalExactos++
      })
      pts.set(r.planilla_id, totalPts)
      exactos.set(r.planilla_id, totalExactos)
    })

    // Filtrar solo jugadores que apostaron en este torneo
    const active = ranking.filter(r =>
      tournamentMatches.some(m => bets[r.planilla_id]?.[m.id])
    )

    return [...active]
      .sort((a, b) => (pts.get(b.planilla_id) ?? 0) - (pts.get(a.planilla_id) ?? 0))
      .map((r, i) => ({
        ...r,
        puntos_totales: pts.get(r.planilla_id) ?? 0,
        exactos_count: exactos.get(r.planilla_id) ?? 0,
        position: i + 1,
      }))
  }, [selectedTournamentId, bets, allMatches, ranking])

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const displayRanking = selectedTournamentId ? (tournamentRanking ?? []) : ranking
  const isLoadingDisplay = loading || (selectedTournamentId && loadingTournament)

  const handleShare = async (r: RankingEntry) => {
    const text = `${r.user_name} está #${r.position} en el PRODE Caballito con ${r.puntos_totales} puntos 🏆`
    const url = window.location.origin + '/ranking'
    if (navigator.share) {
      await navigator.share({ title: 'PRODE Caballito', text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const myEntry = displayRanking.find((r) => r.user_id === user?.id)

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#001A4B]">🏆 Ranking</h1>

      {/* Selector de torneo */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTournamentId('')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            !selectedTournamentId
              ? 'bg-[#001A4B] text-white border-[#001A4B]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          Global
        </button>
        {tournaments.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTournamentId(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              selectedTournamentId === t.id
                ? 'bg-[#001A4B] text-white border-[#001A4B]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {isLoadingDisplay ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* Mi posición */}
          {myEntry && (
            <div
              onClick={() => setSelected(myEntry)}
              className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] rounded-xl p-4 text-white flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="text-3xl font-black">#{myEntry.position}</div>
              {myEntry.user_avatar
                ? <img src={myEntry.user_avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                    {myEntry.user_name[0].toUpperCase()}
                  </div>
              }
              <div className="flex-1">
                <p className="font-semibold">{myEntry.user_name}</p>
                <p className="text-white/60 text-xs">
                  {selectedTournament ? selectedTournament.name : 'Ranking Global'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-[#FFDF00]">{myEntry.puntos_totales}</p>
                <p className="text-white/60 text-xs">puntos</p>
              </div>
            </div>
          )}

          {/* Info torneo cuando no hay partidos terminados aún */}
          {selectedTournamentId && tournamentRanking !== null && tournamentRanking.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700 font-medium">El torneo aún no tiene partidos terminados</p>
              <p className="text-xs text-blue-500 mt-1">El ranking se mostrará cuando haya resultados</p>
            </div>
          )}

          {/* Tabla */}
          {displayRanking.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {selectedTournament && (
                <div className="bg-[#001A4B] px-4 py-2">
                  <p className="text-xs font-semibold text-white/80">{selectedTournament.name} · {selectedTournament.fase}</p>
                </div>
              )}
              <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                <span>#</span>
                <span>Jugador</span>
                <span className="text-center">Exactos</span>
                <span className="text-right">Pts</span>
              </div>
              {displayRanking.map((r, i) => {
                const isMe = r.user_id === user?.id
                return (
                  <div
                    key={r.planilla_id}
                    onClick={() => setSelected(r)}
                    className={`grid grid-cols-[2rem_1fr_auto_auto] gap-2 items-center px-4 py-3 cursor-pointer transition-colors ${i < displayRanking.length - 1 ? 'border-b border-gray-50' : ''} ${isMe ? 'bg-blue-50 hover:bg-blue-100/70' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-sm font-bold text-gray-400">
                      {i < 3 ? MEDAL[i] : r.position}
                    </span>
                    <div className="min-w-0 flex items-center gap-2.5">
                      {r.user_avatar
                        ? <img src={r.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                        : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {r.user_name[0].toUpperCase()}
                          </div>
                      }
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                          {r.user_name} {isMe && <span className="text-xs font-normal">(vos)</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{r.nombre_planilla}
                          {!r.precio_pagado && <span className="ml-1 text-orange-400 font-medium">· no oficial</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-center text-gray-600">{r.exactos_count}</span>
                    <span className="font-black text-[#0042A5] text-right">{r.puntos_totales}</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Drawer / modal de jugador */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto"
            style={{ animation: 'slideUp 0.25s ease-out both' }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-6 pt-3 pb-5">
              <div className="flex items-center gap-4">
                {selected.user_avatar
                  ? <img src={selected.user_avatar} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-[#0042A5]/20 shrink-0" />
                  : <div className="w-16 h-16 rounded-full bg-[#0042A5] flex items-center justify-center text-2xl font-black text-white shrink-0">
                      {selected.user_name[0].toUpperCase()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">
                      {selected.position <= 3 ? MEDAL[selected.position - 1] : `#${selected.position}`}
                    </span>
                    <h2 className="text-base font-bold text-[#001A4B] truncate">{selected.user_name}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{selected.nombre_planilla}</p>
                  {selectedTournament && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{selectedTournament.name}</span>
                  )}
                  {!selected.precio_pagado && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium ml-1">No oficial</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-black text-[#0042A5]">{selected.puntos_totales}</p>
                  <p className="text-xs text-gray-400">puntos</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: 'Exactos', value: selected.exactos_count, color: 'text-red-500' },
                  { label: '+Bonus', value: selected.aciertos_celeste, color: 'text-sky-500' },
                  { label: 'Parciales', value: selected.aciertos_verde, color: 'text-green-600' },
                  { label: 'Tendencia', value: selected.aciertos_amarillo, color: 'text-yellow-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value || 0}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Link
                  to={`/planilla/${selected.planilla_id}`}
                  className="flex-1 bg-[#001A4B] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#002870] transition-colors"
                  onClick={() => setSelected(null)}
                >
                  Ver planilla completa
                </Link>
                <button
                  onClick={() => handleShare(selected)}
                  className="flex-1 border-2 border-[#001A4B] text-[#001A4B] text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {shared ? '✓ Copiado' : '↗ Compartir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
