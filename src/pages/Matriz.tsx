import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useAuthStore } from '@/store/authStore'
import type { Match, RankingEntry } from '@/types'

type BetMap = Record<string, Record<string, { home: number; away: number }>>

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
  const t = useT()
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const popW = Math.min(220, window.innerWidth - 24)
  const popH = 200
  const rawTop  = cell.rect.bottom + 8
  const rawLeft = cell.rect.left + cell.rect.width / 2 - popW / 2
  const top  = rawTop + popH > window.innerHeight - 16
    ? Math.max(8, cell.rect.top - 8 - popH)
    : rawTop
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popW - 8))

  const { match, bet, result } = cell
  const isExactoLocal = bet.home === match.resultado_local
  const isExactoVisitante = bet.away === match.resultado_visitante
  const color = result.color as string

  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: popW }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-pop"
    >
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          <span className="truncate">{match.home_team}</span>
          <span className="text-gray-300">vs</span>
          <span className="truncate text-right">{match.away_team}</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="text-2xl font-black text-gray-800">{match.resultado_local}</span>
          <span className="text-xs text-gray-300 font-bold">—</span>
          <span className="text-2xl font-black text-gray-800">{match.resultado_visitante}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{t.match.yourBet}</span>
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

        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
          color === 'celeste' ? 'bg-sky-50' :
          color === 'rojo'    ? 'bg-red-50' :
          color === 'verde'   ? 'bg-green-50' :
          color === 'amarillo'? 'bg-yellow-50' :
                                'bg-gray-50'
        }`}>
          <span className="text-xs font-semibold text-gray-600">
            {t.match.popIcons[color as keyof typeof t.match.popIcons]} {t.match.popLabels[color as keyof typeof t.match.popLabels]}
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
            {t.match.bonusNote}
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}

export function Matriz() {
  const { user } = useAuthStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [loading, setLoading] = useState(true)
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [filterColors, setFilterColors] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [showVedaModal, setShowVedaModal] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const headerInnerRef = useRef<HTMLDivElement>(null)

  const onBodyScroll = () => {
    if (headerInnerRef.current && tableRef.current) {
      headerInnerRef.current.scrollLeft = tableRef.current.scrollLeft
    }
  }

  const loadMatrizData = useCallback(async () => {
    const [mRes, rRes, bRes, favRes] = await Promise.all([
      api.get('/matches?limit=200'),
      api.get('/ranking?limit=200&include_unpaid=true'),
      api.get('/bets/all-for-matrix'),
      api.get('/ranking/favorites').catch(() => ({ data: { data: [] } })),
    ])
    setMatches(mRes.data.data.matches)
    setRanking(rRes.data.data.ranking)
    setBets(bRes.data.data)
    setFavorites(new Set(favRes.data.data || []))
  }, [])

  useEffect(() => {
    loadMatrizData().finally(() => setLoading(false))
    const interval = setInterval(loadMatrizData, 30000)
    return () => clearInterval(interval)
  }, [loadMatrizData])

  const handleToggleFavorite = useCallback(async (planillaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingFav) return
    setTogglingFav(planillaId)
    try {
      const { data } = await api.post(`/ranking/favorites/${planillaId}`, {})
      setFavorites(prev => {
        const next = new Set(prev)
        if (data.action === 'added') next.add(planillaId)
        else next.delete(planillaId)
        return next
      })
    } catch { /* silent */ } finally { setTogglingFav(null) }
  }, [togglingFav])

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
    if (activeCell?.matchId === matchId && activeCell?.rowKey === rowKey) {
      setActiveCell(null)
      return
    }
    setActiveCell({ matchId, rowKey, bet, match, result, rect })
  }, [activeCell])


  const filteredMatches = matches
  const finishedMatches = filteredMatches.filter(m => m.estado === 'finished')
  const pendingMatches  = filteredMatches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const baseRows: RankingEntry[] = ranking

  const tournamentPts = new Map<string, number>()
  baseRows.forEach(r => {
    const playerBets = bets[r.planilla_id] || {}
    const pts = finishedMatches.reduce((total, m) => {
      const b = playerBets[m.id]
      if (!b || m.resultado_local === undefined || m.resultado_visitante === undefined) return total
      return total + calcularPuntaje(
        { goles_local: b.home, goles_visitante: b.away },
        { resultado_local: m.resultado_local!, resultado_visitante: m.resultado_visitante! }
      ).puntos
    }, 0)
    tournamentPts.set(r.planilla_id, pts)
  })

  const rows = [...baseRows].sort(
    (a, b) => (tournamentPts.get(b.planilla_id) ?? 0) - (tournamentPts.get(a.planilla_id) ?? 0)
  )

  const getBetsForRow = (r: RankingEntry) => bets[r.planilla_id] || {}

  return (
    <div className="px-2 py-4 space-y-3" onClick={() => setActiveCell(null)}>
      <style>{`
        @keyframes pop {
          0%   { opacity: 0; transform: scale(0.92) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop { animation: pop 0.15s ease-out both; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#001A4B]">{t.matrix.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            {t.matrix.players(rows.length)} · {t.matrix.matches(allMatches.length)}
          </p>
        </div>

      </div>

      {finishedMatches.length > 0 && (
        <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs items-center">
          {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation()
                setFilterColors(prev => {
                  const next = new Set(prev)
                  next.has(c) ? next.delete(c) : next.add(c)
                  return next
                })
              }}
              className={`px-2 py-0.5 rounded font-medium transition-all ${POINT_COLORS[c]} ${
                filterColors.has(c)
                  ? 'ring-2 ring-offset-1 ring-gray-500 scale-105 shadow'
                  : filterColors.size > 0
                    ? 'opacity-40'
                    : ''
              }`}
            >
              {t.matrix.ptsLabel[c]}
            </button>
          ))}
          {filterColors.size > 0 && (
            <button
              onClick={() => setFilterColors(new Set())}
              className="text-gray-400 hover:text-gray-600 font-medium ml-1"
            >
              ✕ limpiar
            </button>
          )}
          {filterColors.size === 0 && <span className="text-gray-400 ml-1">{t.matrix.legend}</span>}
        </div>
      )}

      {activeCell && (
        <BetPopover cell={activeCell} onClose={() => setActiveCell(null)} />
      )}

      {allMatches.length === 0 ? (
        <div className="max-w-7xl mx-auto px-2 text-center py-10 text-gray-400 text-sm">
          {t.matrix.noMatches}
        </div>
      ) : (
        <>
        {/* ── Sticky header fuera del overflow-x container ────────────────
            Fix iOS Safari: sticky en <th> se rompe si cualquier ancestor
            tiene overflow-x:auto. Solución: header en div sticky separado,
            sincronizado con el body via JS onBodyScroll.
        ── */}
        <div className="sticky top-14 z-20 overflow-hidden shadow-sm">
          <div ref={headerInnerRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-[#001A4B] text-white">
                  <th className="sticky left-0 bg-[#001A4B] px-2 py-2 text-left font-semibold z-30 min-w-[140px] sm:min-w-[180px]">
                    {t.ranking.player}
                  </th>
                  <th className="px-2 py-2 text-center font-semibold w-14 bg-[#001A4B]">{t.ranking.pts}</th>
                  {allMatches.map((m) => (
                    <th key={m.id} className="px-1 py-2 text-center font-medium min-w-[60px] bg-[#001A4B]">
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
            </table>
          </div>
        </div>

        {/* ── Body con scroll horizontal del usuario ── */}
        <div ref={tableRef} onScroll={onBodyScroll} className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.6)_rgba(203,213,225,0.4)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200/40">
          <table className="text-xs border-collapse min-w-max">
            {/* thead invisible: fuerza que las columnas del body tengan
                el mismo ancho mínimo que el header visible */}
            <thead aria-hidden>
              <tr className="invisible">
                <th className="min-w-[140px] sm:min-w-[180px] p-0" />
                <th className="w-14 p-0" />
                {allMatches.map((m) => <th key={m.id} className="min-w-[60px] p-0" />)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const isMe = r.user_id === user?.id
                const isUnpaid = !r.precio_pagado
                const playerBets = getBetsForRow(r)
                const rowBg = isMe ? 'bg-blue-50' : isUnpaid ? 'bg-orange-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                const rowKey = `${r.planilla_id}-${ri}`
                const pts = tournamentPts.get(r.planilla_id) ?? 0
                const pos = ri + 1
                return (
                  <tr key={rowKey} className={`${rowBg} hover:bg-yellow-50/50 transition-colors ${isUnpaid && !isMe ? 'border-l-4 border-orange-400' : ''}`}>
                    <td className={`sticky left-0 px-1.5 sm:px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg} min-w-[140px] sm:min-w-auto`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {pos}
                        </span>
                        {r.user_avatar
                          ? <img src={r.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100" />
                          : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-300 text-gray-600'}`}>
                              {r.user_name[0].toUpperCase()}
                            </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className={`truncate max-w-[90px] sm:max-w-[105px] text-[11px] sm:text-xs font-semibold ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                            {r.user_name}
                          </div>
                          {r.nombre_planilla && (
                            <span className="block text-[10px] text-gray-400 truncate max-w-[90px]">{r.nombre_planilla}</span>
                          )}
                          {isUnpaid && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white leading-none whitespace-nowrap">
                              ⚠️ {t.ranking.noOfficial}
                            </span>
                          )}
                        </div>
                        {r.whatsapp_number && !isMe && (
                          <a
                            href={`https://wa.me/${r.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`WhatsApp a ${r.user_name}`}
                            className="shrink-0 transition-opacity opacity-80 hover:opacity-100 leading-none"
                            style={{ color: '#25D366' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.057 23.57a.5.5 0 00.613.613l5.708-1.475A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.733.965.99-3.619-.235-.373A9.818 9.818 0 112 12c0-5.42 4.398-9.818 9.818-9.818z"/></svg>
                          </a>
                        )}
                        {!isMe && (
                          <button
                            onClick={(e) => handleToggleFavorite(r.planilla_id, e)}
                            disabled={togglingFav === r.planilla_id}
                            className="shrink-0 text-sm leading-none opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                            title={favorites.has(r.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                          >
                            {favorites.has(r.planilla_id) ? '⭐' : '☆'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center font-black text-[#0042A5]">{pts}</td>
                    {allMatches.map((m) => {
                      const b = playerBets[m.id]
                      const isCutoffPassed = new Date() > new Date(m.time_cutoff)

                      if (m.estado === 'finished' && m.resultado_local !== undefined) {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
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
                                ${filterColors.size > 0 && !filterColors.has(res.color) ? 'opacity-10 pointer-events-none' : ''}
                              `}
                            >
                              {b.home}-{b.away}
                            </span>
                          </td>
                        )
                      }

                      // Partido pendiente: solo el propio usuario ve su apuesta (o si el cutoff ya pasó)
                      if (isMe || isCutoffPassed) {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center text-gray-500 font-medium">
                            {b.home}-{b.away}
                          </td>
                        )
                      }

                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center">
                          {b
                            ? <span
                                onClick={(e) => { e.stopPropagation(); setShowVedaModal(true) }}
                                className="inline-block text-[13px] cursor-pointer select-none opacity-50 hover:opacity-80 transition-opacity"
                                title="Período de veda activo"
                              >🔒</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modal: período de veda */}
      {showVedaModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowVedaModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto"
              style={{ animation: 'pop 0.2s ease-out both' }}
            >
              <div className="text-center space-y-3">
                <div className="text-4xl">🔒</div>
                <h3 className="font-bold text-[#001A4B] text-base">Período de veda activo</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Las apuestas de otros jugadores no se pueden ver hasta que finalice el período de veda de este partido.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Una vez que comience el partido, podrás ver todos los pronósticos.
                </p>
                <button
                  onClick={() => setShowVedaModal(false)}
                  className="w-full bg-[#001A4B] text-white font-bold py-2.5 rounded-xl text-sm mt-2 hover:bg-[#002870] transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
