import { useState } from 'react'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { ptBR } from 'date-fns/locale'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useTeamBadgesStore, getTeamBadge } from '@/store/teamBadgesStore'
import type { Match, Bet } from '@/types'

interface Props {
  match: Match
  bet?: Bet
  planillaId?: string
  onBetSaved?: (bet: Bet) => void
  onBetDeleted?: (matchId: string) => void
  readonly?: boolean
}

function TeamDisplay({ team }: { team: string }) {
  const badges = useTeamBadgesStore(s => s.badges)
  const badgeUrl = getTeamBadge(team, badges)
  const flag = teamFlag(team)
  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{ width: 64, height: 44, borderRadius: 8, background: 'var(--flag-bg, #f1f5f9)' }}
    >
      {badgeUrl
        ? <img src={badgeUrl} alt={team} className="w-full h-full object-contain p-1" />
        : flag
          ? <span style={{ fontSize: 32, lineHeight: 1 }}>{flag}</span>
          : <span className="text-[#001A4B] font-black text-lg leading-none">—</span>
      }
    </div>
  )
}

export function MatchCard({ match, bet, planillaId, onBetSaved, onBetDeleted, readonly }: Props) {
  const { show } = useToastStore()
  const t = useT()
  const lang = useAuthStore(s => s.user?.idioma_pref || 'es')
  const [score, setScore] = useState(
    bet ? `${bet.goles_local}-${bet.goles_visitante}` : ''
  )
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  // Team names in user's language
  const homeTeam = (lang === 'pt' && match.home_team_pt) ? match.home_team_pt : match.home_team
  const awayTeam = (lang === 'pt' && match.away_team_pt) ? match.away_team_pt : match.away_team

  const isClosed = new Date() > new Date(match.time_cutoff)
  const isFinished = match.estado === 'finished'
  const isLive = match.estado === 'live'
  const dateLocale = lang === 'pt' ? ptBR : esLocale

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
      show(t.match.invalidFormat, 'error'); return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/bets/score', {
        planilla_id: planillaId,
        match_id: match.id,
        score,
      })
      show(t.match.saved, 'success')
      onBetSaved?.(data.data)
      setEditing(false)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || t.match.errorSave
      show(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!planillaId || !bet) return
    try {
      await api.delete(`/bets/planillas/${planillaId}/matches/${match.id}`)
      show(t.match.deleted, 'info')
      onBetDeleted?.(match.id)
      setScore('')
      setEditing(false)
    } catch {
      show(t.match.errorDelete, 'error')
    }
  }

  const canEdit = !isClosed && !isFinished && !readonly && planillaId

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Tournament header */}
      {match.tournament_name && (
        <div className="bg-[#001A4B] text-white text-xs px-4 py-2 text-center font-medium tracking-wide">
          {match.tournament_name} · {match.tournament_fase}
        </div>
      )}

      {/* Body: 3-column */}
      <div className="px-4 pt-5 pb-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        {/* Local */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[34px] font-[500] text-[#001A4B] leading-none tabular-nums">
            {isFinished ? match.resultado_local : '—'}
          </span>
          <TeamDisplay team={match.home_team} />
          <span className="text-xs font-semibold text-[#001A4B] text-center leading-tight">
            {homeTeam}
          </span>
        </div>

        {/* Centre: VS + status */}
        <div className="flex flex-col items-center gap-1 px-2">
          {isLive ? (
            <>
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {t.match.live}
              </span>
              {match.halftime_minutes != null && (
                <span className="text-[11px] text-green-600 font-semibold">{match.halftime_minutes}'</span>
              )}
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400 font-medium">{t.match.vs}</span>
              {!isFinished && (
                <span className="text-[11px] text-gray-400 text-center leading-snug whitespace-nowrap">
                  {format(new Date(match.start_time), "d MMM HH:mm", { locale: dateLocale })}
                </span>
              )}
            </>
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[34px] font-[500] text-[#001A4B] leading-none tabular-nums">
            {isFinished ? match.resultado_visitante : '—'}
          </span>
          <TeamDisplay team={match.away_team} />
          <span className="text-xs font-semibold text-[#001A4B] text-center leading-tight">
            {awayTeam}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-4 mt-4 mb-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 min-h-[36px]">

        {/* Left: pronóstico */}
        <div className="flex items-center gap-2">
          {editing ? null : bet ? (
            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${pointResult ? POINT_COLORS[pointResult.color] : 'bg-blue-100 text-blue-700'}`}>
              {bet.goles_local}-{bet.goles_visitante}
              {pointResult && <span className="ml-1 opacity-80">· {pointResult.puntos}pts</span>}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">{t.match.noBet}</span>
          )}
          {editing && (
            <input
              type="text"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="2-1"
              autoFocus
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-20 text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          )}
        </div>

        {/* Right: action */}
        <div className="flex items-center gap-2 shrink-0">
          {canEdit ? (
            editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="t-btn-cta text-xs px-4 py-2 disabled:opacity-50"
                >
                  {saving ? '...' : t.match.bet}
                </button>
                <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  {t.match.cancel}
                </button>
              </>
            ) : bet ? (
              <>
                <button
                  onClick={() => { setEditing(true); setScore(`${bet.goles_local}-${bet.goles_visitante}`) }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t.match.edit}
                </button>
                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">×</button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="t-btn-cta text-xs px-4 py-2"
              >
                {t.match.bet}
              </button>
            )
          ) : isClosed && !isFinished ? (
            <span className="text-xs bg-red-100 text-red-500 px-2.5 py-1 rounded-full font-medium">
              {t.match.closed}
            </span>
          ) : pointResult?.bonus ? (
            <span className="text-xs bg-sky-100 text-sky-600 px-2.5 py-1 rounded-full font-bold">{t.match.bonus}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
