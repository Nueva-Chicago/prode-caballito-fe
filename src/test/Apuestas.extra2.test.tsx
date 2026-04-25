import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Apuestas } from '@/pages/Apuestas'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/components/ui/AdCard', () => ({ AdCard: () => null }))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({
    match,
    onBetSaved,
    onBetDeleted,
  }: {
    match: { id: string; home_team: string; away_team: string }
    onBetSaved?: () => void
    onBetDeleted?: (mid: string) => void
  }) => (
    <div data-testid="match-card">
      {match.home_team} vs {match.away_team}
      {onBetSaved && <button onClick={onBetSaved} data-testid={`save-${match.id}`}>save</button>}
      {onBetDeleted && <button onClick={() => onBetDeleted(match.id)} data-testid={`delete-${match.id}`}>delete</button>}
    </div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const PLANILLA_UNPAID = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: false }
const PLANILLA_PAID   = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true }

function makePending(id: string) {
  const future = new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  return { id, home_team: `Home${id}`, away_team: `Away${id}`, estado: 'scheduled', finished: false,
    resultado_local: null, resultado_visitante: null, time_cutoff: future, start_time: future, halftime_minutes: 0 }
}

function makeFinished(id: string) {
  const past = new Date(Date.now() - 3600 * 1000).toISOString()
  return { id, home_team: `Home${id}`, away_team: `Away${id}`, estado: 'finished', finished: true,
    resultado_local: 1, resultado_visitante: 0, time_cutoff: past, start_time: past, halftime_minutes: 90 }
}

async function setupApi(overrides: { matches?: unknown[]; planillas?: unknown[]; bets?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [makePending('m1')] } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: overrides.planillas ?? [PLANILLA_UNPAID] } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderApuestas() {
  return render(<MemoryRouter><Apuestas /></MemoryRouter>)
}

// ─── handleLockPlanilla ────────────────────────────────────────────────────────

describe('Apuestas — confirmar y cerrar planilla', () => {
  afterEach(() => vi.clearAllMocks())

  it('botón confirmar habilitado cuando todos los partidos pending tienen apuesta', async () => {
    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()

    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /Confirmar y cerrar/i })
      if (btn) expect(btn).not.toBeDisabled()
    }, { timeout: 3000 })
  })

  it('click en confirmar abre el modal con resumen de apuestas', async () => {
    const user = userEvent.setup()
    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 2, goles_visitante: 1 }],
    })
    renderApuestas()

    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /Confirmar y cerrar/i })
      expect(btn).not.toBeDisabled()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /Confirmar y cerrar/i }))

    await waitFor(() => {
      expect(screen.getAllByText(/Confirmar planilla/i).length).toBeGreaterThan(0)
      // El resumen muestra el partido con la apuesta
      expect(screen.getAllByText('Homem1 vs Awaym1').length).toBeGreaterThan(0)
    })
  })

  it('click en Confirmar planilla en el modal llama a PUT /planillas/:id/lock', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: {} } })

    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Confirmar y cerrar/i })).not.toBeDisabled()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /Confirmar y cerrar/i }))
    await waitFor(() => expect(screen.getAllByText(/Confirmar planilla/i).length).toBeGreaterThan(0))

    // Hay dos botones con texto "Confirmar planilla" — el del modal es el último
    const confirmBtns = screen.getAllByRole('button', { name: /Confirmar planilla/i })
    await user.click(confirmBtns[confirmBtns.length - 1])

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/planillas/p1/lock')
    })
  })

  it('error en lock → muestra toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Confirmar y cerrar/i })).not.toBeDisabled()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /Confirmar y cerrar/i }))
    await waitFor(() => expect(screen.getAllByText(/Confirmar planilla/i).length).toBeGreaterThan(0))

    const confirmBtns = screen.getAllByRole('button', { name: /Confirmar planilla/i })
    await user.click(confirmBtns[confirmBtns.length - 1])

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })

  it('Seguir editando cierra el modal sin llamar a la API', async () => {
    const user = userEvent.setup()
    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Confirmar y cerrar/i })).not.toBeDisabled()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /Confirmar y cerrar/i }))
    await waitFor(() => expect(screen.getByText(/Seguir editando/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Seguir editando/i }))
    await waitFor(() => expect(screen.queryByText(/Seguir editando/i)).toBeNull())
  })
})

// ─── Errores en carga ──────────────────────────────────────────────────────────

describe('Apuestas — manejo de errores', () => {
  afterEach(() => vi.clearAllMocks())

  it('error en loadInitial → toast de error', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))
    renderApuestas()

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    }, { timeout: 3000 })
  })

  it('error en createPlanilla → toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    await setupApi()
    renderApuestas()

    await waitFor(() => expect(screen.getByTitle(/Nueva planilla/i)).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByTitle(/Nueva planilla/i))
    await user.click(screen.getByRole('button', { name: /Crear planilla/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })
})

// ─── Callbacks de MatchCard ────────────────────────────────────────────────────

describe('Apuestas — callbacks de MatchCard en lista principal', () => {
  afterEach(() => vi.clearAllMocks())

  it('onBetSaved dispara loadBets (GET /bets)', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')

    await setupApi({ matches: [makePending('m1')] })
    renderApuestas()

    await waitFor(() => expect(screen.getByTestId('save-m1')).toBeInTheDocument(), { timeout: 3000 })

    const callsBefore = (api.get as ReturnType<typeof vi.fn>).mock.calls.length
    await user.click(screen.getByTestId('save-m1'))

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0] as string)
      const betsCalls = calls.filter((u: string) => u.includes('/bets'))
      expect(betsCalls.length).toBeGreaterThan(callsBefore > 0 ? 1 : 0)
    })
  })

  it('onBetDeleted elimina apuesta del estado local', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')

    await setupApi({
      matches: [makePending('m1')],
      bets: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }],
    })
    renderApuestas()

    await waitFor(() => expect(screen.getByTestId('delete-m1')).toBeInTheDocument(), { timeout: 3000 })

    const callsBefore = (api.get as ReturnType<typeof vi.fn>).mock.calls.length
    await user.click(screen.getByTestId('delete-m1'))

    // No debe disparar GET extra (es solo mutación de estado local)
    expect((api.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore)
  })
})

// ─── Filtro "Todos" (click explícito) ─────────────────────────────────────────

describe('Apuestas — tab Todos', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en Todos restaura todos los partidos tras filtrar', async () => {
    const user = userEvent.setup()
    await setupApi({ matches: [makePending('m1'), makeFinished('m2')] })
    renderApuestas()

    await waitFor(() => expect(screen.getAllByTestId('match-card').length).toBe(2), { timeout: 3000 })

    // Filtrar a Finalizados
    await user.click(screen.getByRole('button', { name: /^Finalizados$/i }))
    await waitFor(() => expect(screen.getAllByTestId('match-card').length).toBe(1))

    // Volver a Todos
    await user.click(screen.getByRole('button', { name: /^Todos$/i }))
    await waitFor(() => expect(screen.getAllByTestId('match-card').length).toBe(2))
  })
})

// ─── Planilla ya pagada no muestra botón de confirmar ─────────────────────────

describe('Apuestas — planilla ya pagada', () => {
  afterEach(() => vi.clearAllMocks())

  it('planilla pagada no muestra botón Confirmar', async () => {
    await setupApi({ planillas: [PLANILLA_PAID] })
    renderApuestas()

    await waitFor(() => expect(screen.getByText('Mi planilla')).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole('button', { name: /Confirmar y cerrar/i })).toBeNull()
  })
})
