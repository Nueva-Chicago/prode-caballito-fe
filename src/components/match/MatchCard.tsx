import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import type { Match, Bet } from '@/types'

interface Props {
  match: Match
  bet?: Bet
  planillaId?: string
  onBetSaved?: (bet: Bet) => void
  onBetDeleted?: (matchId: string) => void
  readonly?: boolean
}

export function MatchCard({ match, bet, planillaId, onBetSaved, onBetDeleted, readonly }: Props) {
  const { show } = useToastStore()
  const [score, setScore] = useState(
    bet ? `${bet.goles_local}-${bet.goles_visitante}` : ''
  )
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const isClosed = new Date() > new Date(match.time_cutoff)
  const isFinished = match.estado === 'finished'

  const pointResult = isFinished && bet
    ? calcularPuntaje(
        { goles_local: bet.goles_local, goles_visitante: bet.goles_visitante },
        { resultado_local: match.resultado_local!, resultado_visitante: match.resultado_visitante! }
      )
    : null

  const handleSave = async () => {
    if (!planillaId) return
    const parts = score.split(/[-:]/).map(Number)
    if (parts.length !== 2 || parts.some(isNaN)) {
      show('Formato inválido. Usá: 2-1', 'error'); return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/bets/score', {
        planilla_id: planillaId,
        match_id: match.id,
        score,
      })
      show('Pronóstico guardado ✓', 'success')
      onBetSaved?.(data.data)
      setEditing(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al guardar'
      show(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!planillaId || !bet) return
    try {
      await api.delete(`/bets/planillas/${planillaId}/matches/${match.id}`)
      show('Pronóstico eliminado', 'info')
      onBetDeleted?.(match.id)
      setScore('')
      setEditing(false)
    } catch {
      show('Error al eliminar', 'error')
    }
  }

  const canEdit = !isClosed && !isFinished && !readonly && planillaId

  return (
    <div className={`match-card bg-white rounded-xl shadow-sm border ${isFinished ? 'border-gray-100' : 'border-blue-50'} overflow-hidden`}>
      {/* Torneo / fase */}
      {match.tournament_name && (
        <div className="bg-[#001A4B] text-white text-xs px-3 py-1 text-center font-medium">
          {match.tournament_name} · {match.tournament_fase}
        </div>
      )}

      <div className="p-4">
        {/* Equipos y resultado */}
        <div className="flex items-center justify-between gap-2">
          {/* Local */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-2xl md:text-3xl font-bold text-[#001A4B]">
              {isFinished ? match.resultado_local : '—'}
            </span>
            <span className="mt-1 text-xs md:text-sm font-medium text-center truncate w-full px-1">
              {match.home_team}
            </span>
          </div>

          {/* Centro */}
          <div className="flex flex-col items-center px-2">
            <span className="text-xs text-gray-400 font-semibold mb-1">VS</span>
            {match.estado === 'live' && (
              <span className="text-xs font-semibold text-green-600 animate-pulse">EN VIVO</span>
            )}
            {!isFinished && (
              <span className="text-xs text-gray-400 text-center">
                {format(new Date(match.start_time), "d MMM HH:mm", { locale: es })}
              </span>
            )}
          </div>

          {/* Visitante */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-2xl md:text-3xl font-bold text-[#001A4B]">
              {isFinished ? match.resultado_visitante : '—'}
            </span>
            <span className="mt-1 text-xs md:text-sm font-medium text-center truncate w-full px-1">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Pronóstico */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {bet && !editing ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Tu pronóstico:</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${pointResult ? POINT_COLORS[pointResult.color] : 'bg-blue-100 text-blue-700'}`}>
                  {bet.goles_local}-{bet.goles_visitante}
                  {pointResult && ` · ${pointResult.puntos}pts`}
                </span>
                {pointResult?.bonus && <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-bold">BONUS</span>}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(true); setScore(`${bet.goles_local}-${bet.goles_visitante}`) }}
                    className="text-xs text-blue-600 hover:underline">Editar</button>
                  <button onClick={handleDelete} className="text-xs text-red-400 hover:underline ml-2">×</button>
                </div>
              )}
            </div>
          ) : canEdit ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="2-1"
                className="border rounded-lg px-3 py-1.5 text-sm w-20 text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button onClick={handleSave} disabled={saving}
                className="bg-[#FFDF00] text-[#001A4B] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                {saving ? '...' : bet ? 'Actualizar' : '🎯 Apostar'}
              </button>
              {editing && (
                <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {bet ? (
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${pointResult ? POINT_COLORS[pointResult.color] : 'bg-gray-100 text-gray-500'}`}>
                  {bet.goles_local}-{bet.goles_visitante}
                  {pointResult && ` · ${pointResult.puntos}pts`}
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">Sin pronóstico</span>
              )}
              {isClosed && !isFinished && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Cerrado</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
