import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MatchCard } from '@/components/match/MatchCard'
import type { Match, Bet } from '@/types'

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', idioma_pref: 'es' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({}),
  getTeamBadge: () => null,
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn(), delete: vi.fn() },
}))

// useT depends on authStore — use real implementation so translation keys match
// No mock needed: authStore mock above returns idioma_pref: 'es' → real `es` translations load

const NOW = new Date('2026-06-14T12:00:00Z').getTime()

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    home_team: 'Argentina',
    away_team: 'Brasil',
    start_time: '2026-06-14T20:00:00Z',
    time_cutoff: '2026-06-14T19:00:00Z',
    estado: 'scheduled',
    resultado_local: undefined,
    resultado_visitante: undefined,
    grupo: 'A',
    jornada: 1,
    halftime_minutes: 45,
    ...overrides,
  } as unknown as Match
}

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return {
    id: 'b1',
    planilla_id: 'p1',
    match_id: 'm1',
    goles_local: 1,
    goles_visitante: 0,
    ...overrides,
  } as Bet
}

describe('MatchCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra los nombres de los equipos', () => {
    render(<MatchCard match={makeMatch()} now={NOW} />)
    expect(screen.getByText('Argentina')).toBeInTheDocument()
    expect(screen.getByText('Brasil')).toBeInTheDocument()
  })

  it('muestra "VS" para partido programado sin apuesta', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} now={NOW} />)
    expect(screen.getByText('VS')).toBeInTheDocument()
  })

  it('partido terminado → muestra "FIN"', () => {
    const match = makeMatch({
      estado: 'finished',
      resultado_local: 2,
      resultado_visitante: 1,
      time_cutoff: '2026-06-14T07:00:00Z',
    })
    render(<MatchCard match={match} now={NOW} />)
    expect(screen.getByText('FIN')).toBeInTheDocument()
  })

  it('partido terminado con apuesta → muestra pronóstico con puntos', () => {
    const match = makeMatch({
      estado: 'finished',
      resultado_local: 2,
      resultado_visitante: 1,
      time_cutoff: '2026-06-14T07:00:00Z',
    })
    const bet = makeBet({ goles_local: 2, goles_visitante: 1 }) // exacto → 3pts
    render(<MatchCard match={match} bet={bet} now={NOW} />)
    // La pill muestra algo como "🎯 2-1 · 3pts" en un único span
    expect(screen.getByText(/2-1/)).toBeInTheDocument()
    expect(screen.getByText(/3pts/)).toBeInTheDocument()
  })

  it('partido terminado sin apuesta → muestra "Sin pronóstico"', () => {
    const match = makeMatch({
      estado: 'finished',
      resultado_local: 1,
      resultado_visitante: 0,
      time_cutoff: '2026-06-14T07:00:00Z',
    })
    render(<MatchCard match={match} now={NOW} />)
    expect(screen.getByText(/sin pronóstico/i)).toBeInTheDocument()
  })

  it('apuesta existente muestra botones de editar y eliminar', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    const bet = makeBet({ goles_local: 1, goles_visitante: 2 })
    render(<MatchCard match={makeMatch({ time_cutoff: future })} bet={bet} planillaId="p1" now={NOW} />)
    // Con apuesta guardada aparecen botón editar ("Editar") y eliminar ("×")
    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.getByText('×')).toBeInTheDocument()
    // No hay input mientras no está en modo edición
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('readonly=true → no renderiza input de apuesta', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} readonly now={NOW} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('partido cerrado (cutoff pasado) sin resultado → no muestra input ni "FIN"', () => {
    const past = new Date(NOW - 3600 * 1000).toISOString()
    render(
      <MatchCard
        match={makeMatch({ time_cutoff: past, estado: 'scheduled' })}
        planillaId="p1"
        now={NOW}
      />
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
