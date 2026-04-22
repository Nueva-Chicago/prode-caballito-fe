import { useState, useEffect } from 'react'
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
import { formatCountdown } from '@/hooks/useCountdown'
import type { Match, Bet } from '@/types'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

function formatReminderCountdown(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return '< 1m'
}

interface Props {
  match: Match
  bet?: Bet
  planillaId?: string
  onBetSaved?: (bet: Bet) => void
  onBetDeleted?: (matchId: string) => void
  readonly?: boolean
  planillaLocked?: boolean
  now?: number
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

export function MatchCard({ match, bet, planillaId, onBetSaved, onBetDeleted, readonly, planillaLocked, now: nowProp }: Props) {
  const { show } = useToastStore()
  const t = useT()
  const lang = useAuthStore(s => s.user?.idioma_pref || 'es')
  const [score, setScore] = useState(
    bet ? `${bet.goles_local}-${bet.goles_visitante}` : ''
  )
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const REMINDER_MINUTES = [5, 10, 15, 30, 60] as const
  type ReminderMinutes = typeof REMINDER_MINUTES[number]
  const hasExistingReminder = !!bet?.scheduled_for && new Date(bet.scheduled_for) > new Date()
  const [reminderEnabled, setReminderEnabled] = useState(hasExistingReminder)
  const initMin = Number(bet?.remind_minutes)
  const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes>(
    (REMINDER_MINUTES as readonly number[]).includes(initMin) ? (initMin as ReminderMinutes) : 15
  )

  // Sync reminder state when bet is refreshed from server (e.g. after save)
  useEffect(() => {
    if (editing) return
    const hasReminder = !!bet?.scheduled_for && new Date(bet.scheduled_for) > new Date()
    setReminderEnabled(hasReminder)
    const savedMin = Number(bet?.remind_minutes)
    if (savedMin && (REMINDER_MINUTES as readonly number[]).includes(savedMin)) {
      setReminderMinutes(savedMin as ReminderMinutes)
    }
  }, [bet?.scheduled_for, bet?.remind_minutes, editing])

  // Team names in user's language
  const homeTeam = (lang === 'pt' && match.home_team_pt) ? match.home_team_pt : match.home_team
  const awayTeam = (lang === 'pt' && match.away_team_pt) ? match.away_team_pt : match.away_team

  const nowMs = nowProp ?? Date.now()
  const cutoffMs = new Date(match.time_cutoff).getTime()
  const isClosed = nowMs > cutoffMs
  const isFinished = match.estado === 'finished'
  const isLive = match.estado === 'live'
  const dateLocale = lang === 'pt' ? ptBR : esLocale

  // Countdown chip: show when within 2 hours of closing and not yet closed
  const msUntilClose = cutoffMs - nowMs
  const showCountdown = !isClosed && !isFinished && msUntilClose > 0 && msUntilClose < TWO_HOURS_MS
  const countdownH = Math.floor(msUntilClose / 3600000)
  const countdownM = Math.floor((msUntilClose % 3600000) / 60000)
  const countdownS = Math.floor((msUntilClose % 60000) / 1000)

  const scheduledForMs = bet?.scheduled_for ? new Date(bet.scheduled_for).getTime() : null
  const msUntilReminder = scheduledForMs ? scheduledForMs - nowMs : null
  const hasActiveReminder = msUntilReminder !== null && msUntilReminder > 0

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
        remind_before_minutes: reminderEnabled && !isClosed ? reminderMinutes : null,
      })
      show(reminderEnabled ? t.match.reminderSet(reminderMinutes) : t.match.saved, 'success')
      onBetSaved?.(data.data)
      setEditing(false)
      setReminderEnabled(false)
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

  const canEdit = !isClosed && !isFinished && !readonly && !planillaLocked && planillaId

  return (
    <div className={`t-surface rounded-xl shadow-sm overflow-hidden transition-all ${
      isLive
        ? 'border-2 border-green-400 shadow-green-100 shadow-md'
        : showCountdown
          ? 'border-2 border-orange-400/60'
          : 'border t-border-page'
    }`}>
      {/* Tournament header */}
      {match.tournament_name && (
        <div className="t-bg-nav text-white text-xs px-4 py-2 text-center font-medium tracking-wide">
          {match.tournament_name}
          {match.grupo && ` · Grupo ${match.grupo}`}
          {match.jornada && ` · J${match.jornada}`}
        </div>
      )}

      {/* Countdown chip */}
      {showCountdown && !bet && (
        <div className="bg-orange-500/15 border-b border-orange-400/30 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-orange-400">
            ⚠️ {t.bets.noBetWarning}
          </span>
          <span className="text-xs font-mono font-bold text-orange-400">
            {t.match.closesIn} {formatCountdown(countdownH, countdownM, countdownS)}
          </span>
        </div>
      )}
      {showCountdown && bet && (
        <div className="bg-amber-500/10 border-b border-amber-400/20 px-4 py-1 flex items-center justify-end">
          <span className="text-xs font-mono text-amber-400">
            {t.match.closesIn} {formatCountdown(countdownH, countdownM, countdownS)}
          </span>
        </div>
      )}

      {/* Date/time bar */}
      {!isLive && !isFinished && (
        <div className="flex items-center justify-between gap-1.5 t-surface border-b t-border-page px-4 py-1.5" style={{ background: 'color-mix(in srgb, var(--theme-page-surface) 60%, var(--theme-page-bg))' }}>
          <div className="flex flex-col">
            <span className="text-xs font-semibold t-text-muted">
              📅 {format(new Date(match.start_time), "EEE d MMM · HH:mm", { locale: dateLocale })} hs
            </span>
            {match.sede && (
              <span className="text-[10px] t-text-muted leading-tight opacity-70">📍 {match.sede}</span>
            )}
          </div>
          {hasActiveReminder && (
            <span className="flex items-center gap-1 text-xs font-semibold t-text-primary">
              🔔 <span className="font-mono">{formatReminderCountdown(msUntilReminder!)}</span>
            </span>
          )}
        </div>
      )}

      {/* Body: 3-column */}
      <div className="px-4 pt-5 pb-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        {/* Local */}
        <div className="flex flex-col items-center gap-2">
          <span className={`text-[34px] leading-none tabular-nums ${
            isFinished ? 'font-[500] t-text-nav'
            : bet ? 'font-black t-text-primary'
            : 'font-[300] t-text-muted opacity-50'
          }`}>
            {isFinished ? match.resultado_local : bet ? bet.goles_local : '—'}
          </span>
          <TeamDisplay team={match.home_team} />
          <span className="text-xs font-semibold t-text-page text-center leading-tight">
            {homeTeam}
          </span>
        </div>

        {/* Centre: VS + status */}
        <div className="flex flex-col items-center gap-1 px-2">
          {isLive ? (
            <>
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {t.match.live}
              </span>
              {match.halftime_minutes != null && (
                <span className="text-[11px] text-green-500 font-semibold">{match.halftime_minutes}'</span>
              )}
            </>
          ) : (
            <span className="text-xs t-text-muted font-medium">{isFinished ? t.match.vs : 'VS'}</span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-2">
          <span className={`text-[34px] leading-none tabular-nums ${
            isFinished ? 'font-[500] t-text-nav'
            : bet ? 'font-black t-text-primary'
            : 'font-[300] t-text-muted opacity-50'
          }`}>
            {isFinished ? match.resultado_visitante : bet ? bet.goles_visitante : '—'}
          </span>
          <TeamDisplay team={match.away_team} />
          <span className="text-xs font-semibold t-text-page text-center leading-tight">
            {awayTeam}
          </span>
        </div>
      </div>

      {/* Recordatorio — visible solo en modo edición y partido no cerrado */}
      {editing && !isClosed && (
        <div className="mx-4 mt-3 pt-3 border-t t-border-page space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={e => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#0042A5] cursor-pointer shrink-0"
            />
            <span className="text-xs t-text-muted">{t.match.remindMe}</span>
          </label>
          {reminderEnabled && (
            <div className="flex items-center gap-2 pl-6">
              <select
                value={reminderMinutes}
                onChange={e => setReminderMinutes(Number(e.target.value) as ReminderMinutes)}
                className="text-xs border t-border-page rounded-lg px-2 py-1.5 t-surface t-text-page focus:outline-none t-focus-ring"
              >
                {REMINDER_MINUTES.map(m => (
                  <option key={m} value={m}>{t.match.reminderOption(m)}</option>
                ))}
              </select>
              <span className="text-xs t-text-muted">{t.match.beforeKickoff}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mx-4 mt-4 mb-4 pt-3 border-t t-border-page flex items-center justify-between gap-3 min-h-[36px]">

        {/* Left: pronóstico — solo muestra pill en partidos terminados (puntaje) o cuando no hay apuesta */}
        <div className="flex items-center gap-2">
          {editing ? null : isFinished && bet && pointResult ? (
            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${POINT_COLORS[pointResult.color]}`}>
              {bet.goles_local}-{bet.goles_visitante}
              <span className="ml-1 opacity-80">· {pointResult.puntos}pts</span>
            </span>
          ) : !isFinished && !bet && !editing ? (
            <span className="text-xs t-text-muted italic">{t.match.noBet}</span>
          ) : null}
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
                <button onClick={() => { setEditing(false); setReminderEnabled(false) }} className="text-xs text-gray-400 hover:text-gray-600">
                  {t.match.cancel}
                </button>
              </>
            ) : bet ? (
              <>
                <button
                  onClick={() => { setEditing(true); setScore(`${bet.goles_local}-${bet.goles_visitante}`); setReminderEnabled(false) }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t.match.edit}
                </button>
                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">×</button>
              </>
            ) : (
              <button
                onClick={() => { setEditing(true); setReminderEnabled(false) }}
                className="t-btn-cta text-xs px-4 py-2"
              >
                {t.match.bet}
              </button>
            )
          ) : planillaLocked && !isFinished ? (
            <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-medium">
              🔒 {t.match.locked}
            </span>
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
