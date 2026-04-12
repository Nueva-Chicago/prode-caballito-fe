import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useAuthStore } from '@/store/authStore'
import type { Match, RankingEntry, Tournament } from '@/types'

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
  const popRef = useRef<HTMLDivElement>(null)

  // Cerrar al click afuera
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Responsive: en móvil ocupa casi todo el ancho, en desktop ancho fijo
  const popW = Math.min(220, window.innerWidth - 24)
  const popH = 200 // altura estimada del popover
  const rawTop  = cell.rect.bottom + 8
  const rawLeft = cell.rect.left + cell.rect.width / 2 - popW / 2
  // Flip: si no cabe abajo, va arriba
  const top  = rawTop + popH > window.innerHeight - 16
    ? Math.max(8, cell.rect.top - 8 - popH)
    : rawTop
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popW - 8))

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

  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: popW }}
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
    </div>,
    document.body
  )
}

export function Matriz() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingTournament, setLoadingTournament] = useState(false)
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [unlocks, setUnlocks] = useState<Map<string, 'approved' | 'pending'>>(new Map())
  const [pendingUnlock, setPendingUnlock] = useState<{ targetUserId: string; targetName: string; match: Match } | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [payStep, setPayStep] = useState<'info' | 'reference'>('info')
  const [paymentRef, setPaymentRef] = useState('')
  const [unlockConfig, setUnlockConfig] = useState<{ price: number; currency: string; payment_link: string; free: boolean }>({ price: 0, currency: 'ARS', payment_link: '', free: true })
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      api.get('/matches?limit=200'),
      api.get('/ranking?limit=200&include_unpaid=true'),
      api.get('/bets/all-for-matrix'),
      api.get('/tournaments'),
      api.get('/bets/my-unlocks').catch(() => ({ data: { data: [] } })),
      api.get('/bets/unlock-price').catch(() => ({ data: { data: { price: 0, currency: 'ARS', payment_link: '', free: true } } })),
    ]).then(([mRes, rRes, bRes, tRes, uRes, priceRes]) => {
      setMatches(mRes.data.data.matches)
      setRanking(rRes.data.data.ranking)
      setBets(bRes.data.data)
      const tourList = tRes.data.data || []
      setTournaments(tourList)
      if (tourList.length > 0) setSelectedTournament(tourList[0].id)
      const unlocksMap = new Map<string, 'approved' | 'pending'>()
      ;(uRes.data.data || []).forEach((u: { target_user_id: string; match_id: string; status: string }) => {
        unlocksMap.set(`${u.target_user_id}_${u.match_id}`, u.status as 'approved' | 'pending')
      })
      setUnlocks(unlocksMap)
      if (priceRes.data.data) setUnlockConfig(priceRes.data.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleRequestUnlock = async () => {
    if (!pendingUnlock) return
    setUnlocking(true)
    try {
      await api.post('/bets/request-unlock', {
        target_user_id: pendingUnlock.targetUserId,
        match_id: pendingUnlock.match.id,
        payment_reference: paymentRef.trim() || undefined,
      })
      const key = `${pendingUnlock.targetUserId}_${pendingUnlock.match.id}`
      setUnlocks(prev => new Map([...prev, [key, 'pending']]))
      setPendingUnlock(null)
      setPayStep('info')
      setPaymentRef('')
    } catch {
      setPendingUnlock(null)
      setPayStep('info')
      setPaymentRef('')
    } finally {
      setUnlocking(false)
    }
  }

  const handleClosePendingUnlock = () => {
    setPendingUnlock(null)
    setPayStep('info')
    setPaymentRef('')
  }

  useEffect(() => {
    setLoadingTournament(false)
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

  const filteredMatches = selectedTournament
    ? matches.filter(m => m.tournament_id === selectedTournament)
    : matches
  const finishedMatches = filteredMatches.filter(m => m.estado === 'finished')
  const pendingMatches  = filteredMatches.filter(m => m.estado !== 'finished')
  const allMatches = [...finishedMatches, ...pendingMatches]

  // Jugadores con apuestas en el torneo
  const baseRows: RankingEntry[] = selectedTournament
    ? ranking.filter(r => allMatches.some(m => bets[r.planilla_id]?.[m.id]))
    : ranking

  // Calcular puntos del torneo (solo partidos terminados del torneo)
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

  // Ordenar por puntos del torneo
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

      {/* Leyenda — solo si hay partidos terminados */}
      {finishedMatches.length > 0 && (
        <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs items-center">
          {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
            <span key={c} className={`px-2 py-0.5 rounded font-medium ${POINT_COLORS[c]}`}>
              {c === 'celeste' ? '4pts' : c === 'rojo' ? '3pts' : c === 'verde' ? '2pts' : c === 'amarillo' ? '1pt' : 'sin acierto'}
            </span>
          ))}
          <span className="text-gray-400 ml-1">· Click en un resultado para ver el detalle</span>
        </div>
      )}

      {activeCell && (
        <BetPopover cell={activeCell} onClose={() => setActiveCell(null)} />
      )}

      {loadingTournament ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : allMatches.length === 0 ? (
        <div className="max-w-7xl mx-auto px-2 text-center py-10 text-gray-400 text-sm">
          No hay partidos en este torneo todavía
        </div>
      ) : (
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
                const playerBets = getBetsForRow(r)
                const rowBg = isMe ? 'bg-blue-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                const rowKey = `${r.planilla_id}-${ri}`
                const pts = tournamentPts.get(r.planilla_id) ?? 0
                const pos = ri + 1
                return (
                  <tr key={rowKey} className={`${rowBg} hover:bg-yellow-50/50 transition-colors`}>
                    <td className={`sticky left-0 px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg}`}>
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
                    <td className="px-2 py-1.5 text-center font-black text-[#0042A5]">{pts}</td>
                    {allMatches.map((m) => {
                      const b = playerBets[m.id]
                      const isCutoffPassed = new Date() > new Date(m.time_cutoff)

                      // Partido terminado: mostrar resultado coloreado
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
                              `}
                            >
                              {b.home}-{b.away}
                            </span>
                          </td>
                        )
                      }

                      // Partido pendiente — propia fila, cutoff pasado, o aprobado
                      const unlockStatus = unlocks.get(`${r.user_id}_${m.id}`)
                      if (isMe || isCutoffPassed || unlockStatus === 'approved') {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center text-gray-500 font-medium">
                            {b.home}-{b.away}
                          </td>
                        )
                      }

                      // Solicitud pendiente de aprobación
                      if (unlockStatus === 'pending') {
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center">
                            <span className="inline-block text-[13px]" title="Solicitud pendiente de aprobación">⏳</span>
                          </td>
                        )
                      }

                      // Sin solicitud — mostrar candado o —
                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center">
                          {b
                            ? <span
                                onClick={(e) => { e.stopPropagation(); setPendingUnlock({ targetUserId: r.user_id, targetName: r.user_name, match: m }) }}
                                className="inline-block px-1.5 py-0.5 rounded text-[13px] bg-gray-100 select-none cursor-pointer hover:bg-gray-200 transition-colors"
                                title="Solicitar ver esta apuesta"
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
      )}
      {/* Sheet de desbloqueo con flujo de pago */}
      {pendingUnlock && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={handleClosePendingUnlock} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6"
            style={{ animation: 'slideUp 0.2s ease-out both' }}>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Partido info siempre visible */}
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{unlockConfig.free ? '🔓' : '💳'}</div>
              <h3 className="font-bold t-text-nav text-base">
                {unlockConfig.free ? 'Solicitar ver apuesta' : 'Desbloquear apuesta'}
              </h3>
              <p className="text-sm text-gray-600 mt-1 font-medium">{pendingUnlock.targetName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pendingUnlock.match.home_team} vs {pendingUnlock.match.away_team}
              </p>
            </div>

            {/* FLUJO GRATUITO */}
            {unlockConfig.free && (
              <>
                <p className="text-xs text-gray-400 text-center mb-5 leading-relaxed">
                  Los administradores recibirán un email con tu solicitud. Una vez aprobada, podrás ver el pronóstico.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleClosePendingUnlock}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleRequestUnlock} disabled={unlocking}
                    className="flex-1 t-btn-primary text-sm py-3">
                    {unlocking ? '...' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            )}

            {/* FLUJO PAGO — paso 1: info y botón de pago */}
            {!unlockConfig.free && payStep === 'info' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Costo del desbloqueo</p>
                  <p className="text-3xl font-black text-amber-600">${unlockConfig.price.toLocaleString('es-AR')}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{unlockConfig.currency}</p>
                </div>
                <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
                  Pagá por MercadoPago y luego ingresá el número de comprobante para enviar tu solicitud al admin.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleClosePendingUnlock}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  {unlockConfig.payment_link ? (
                    <a
                      href={unlockConfig.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setTimeout(() => setPayStep('reference'), 1500)}
                      className="flex-1 bg-[#009EE3] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#0086c3] transition-colors"
                    >
                      Pagar en MercadoPago →
                    </a>
                  ) : (
                    <button onClick={() => setPayStep('reference')}
                      className="flex-1 t-btn-primary text-sm py-3">
                      Ya pagué
                    </button>
                  )}
                </div>
                {unlockConfig.payment_link && (
                  <button onClick={() => setPayStep('reference')}
                    className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-2">
                    Ya pagué, ingresar comprobante →
                  </button>
                )}
              </>
            )}

            {/* FLUJO PAGO — paso 2: ingresar referencia */}
            {!unlockConfig.free && payStep === 'reference' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Número de comprobante / referencia de pago
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Ej: 12345678 o ID de transacción"
                    autoFocus
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#009EE3]"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    El admin verificará el pago antes de aprobar tu solicitud.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setPayStep('info')}
                    className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    ← Volver
                  </button>
                  <button onClick={handleRequestUnlock} disabled={unlocking || !paymentRef.trim()}
                    className="flex-1 t-btn-primary text-sm py-3 disabled:opacity-40">
                    {unlocking ? '...' : 'Enviar solicitud'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
