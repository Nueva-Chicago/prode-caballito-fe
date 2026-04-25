import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchCard } from '@/components/match/MatchCard'
import type { Match, Bet } from '@/types'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
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

describe('MatchCard — renderizado básico', () => {
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

  it('partido live → muestra "EN VIVO"', () => {
    render(<MatchCard match={makeMatch({ estado: 'live' })} now={NOW} />)
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
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

  it('planillaLocked → muestra chip de bloqueado', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(
      <MatchCard
        match={makeMatch({ time_cutoff: future })}
        planillaId="p1"
        planillaLocked
        now={NOW}
      />
    )
    expect(screen.getByText(/🔒/)).toBeInTheDocument()
  })

  it('partido cerrado (cutoff pasado) sin resultado → chip "Cerrado"', () => {
    const past = new Date(NOW - 3600 * 1000).toISOString()
    render(
      <MatchCard
        match={makeMatch({ time_cutoff: past, estado: 'scheduled' })}
        planillaId="p1"
        now={NOW}
      />
    )
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText(/cerrado/i)).toBeInTheDocument()
  })

  it('readonly=true → no renderiza input de apuesta', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} readonly now={NOW} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('sin apuesta y canEdit → botón "Apostar" visible', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} planillaId="p1" now={NOW} />)
    expect(screen.getByText(/apostar/i)).toBeInTheDocument()
  })
})

describe('MatchCard — modo edición', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apuesta existente → botones Editar y × visibles, sin input', () => {
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    const bet = makeBet({ goles_local: 1, goles_visitante: 2 })
    render(<MatchCard match={makeMatch({ time_cutoff: future })} bet={bet} planillaId="p1" now={NOW} />)
    expect(screen.getByText('Editar')).toBeInTheDocument()
    expect(screen.getByText('×')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('click Editar → input con valor previo de la apuesta', async () => {
    const user = userEvent.setup()
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    const bet = makeBet({ goles_local: 1, goles_visitante: 2 })
    render(<MatchCard match={makeMatch({ time_cutoff: future })} bet={bet} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText('Editar'))
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('1-2')
  })

  it('click Apostar → aparece input vacío', async () => {
    const user = userEvent.setup()
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/apostar/i))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('formato inválido → toast error, sin API call', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/apostar/i))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'abc')
    await user.keyboard('{Enter}')
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('válido'), 'error')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('save exitoso → llama onBetSaved y cierra editor', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    const onBetSaved = vi.fn()
    const savedBet = makeBet({ goles_local: 2, goles_visitante: 0 })
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: savedBet } })

    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(
      <MatchCard
        match={makeMatch({ time_cutoff: future })}
        planillaId="p1"
        onBetSaved={onBetSaved}
        now={NOW}
      />
    )
    await user.click(screen.getByText(/apostar/i))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, '2-0')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(onBetSaved).toHaveBeenCalledWith(savedBet))
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('delete exitoso → llama onBetDeleted', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    const onBetDeleted = vi.fn()
    ;(api.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    const bet = makeBet()
    render(
      <MatchCard
        match={makeMatch({ time_cutoff: future })}
        bet={bet}
        planillaId="p1"
        onBetDeleted={onBetDeleted}
        now={NOW}
      />
    )
    await user.click(screen.getByText('×'))
    await waitFor(() => expect(onBetDeleted).toHaveBeenCalledWith('m1'))
  })

  it('error en save → toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Cupo agotado' } },
    })

    const future = new Date(NOW + 8 * 3600 * 1000).toISOString()
    render(<MatchCard match={makeMatch({ time_cutoff: future })} planillaId="p1" now={NOW} />)
    await user.click(screen.getByText(/apostar/i))
    await user.type(screen.getByRole('textbox'), '1-0')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith('Cupo agotado', 'error'))
  })
})
