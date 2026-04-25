import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Planilla } from '@/pages/Planilla'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLANILLA = {
  id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true,
  puntos_totales: 25, exactos_count: 4,
}

function makeMatch(id: string, estado: 'scheduled' | 'finished' = 'scheduled') {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, finished: estado === 'finished',
    resultado_local: estado === 'finished' ? 1 : null,
    resultado_visitante: estado === 'finished' ? 0 : null,
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    halftime_minutes: 0,
  }
}

async function setupApi(overrides: { planilla?: unknown; matches?: unknown[]; bets?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/planillas/')) return Promise.resolve({ data: { data: overrides.planilla ?? PLANILLA } })
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [makeMatch('m1'), makeMatch('m2')] } } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderPlanilla(planillaId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/planilla/${planillaId}`]}>
      <Routes>
        <Route path="/planilla/:planillaId" element={<Planilla />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Planilla — renderizado básico', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra el nombre de la planilla', async () => {
    await setupApi()
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra los puntos totales y exactos', async () => {
    await setupApi()
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('planilla pagada muestra badge "✓ Pagada"', async () => {
    await setupApi()
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getByText(/Pagada/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('planilla no pagada muestra badge "Sin pagar"', async () => {
    await setupApi({ planilla: { ...PLANILLA, precio_pagado: false } })
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getByText(/Sin pagar/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renderiza tarjetas de partidos', async () => {
    await setupApi()
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBeGreaterThanOrEqual(1)
    }, { timeout: 3000 })
  })

  it('planilla no encontrada → muestra mensaje de error', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('not found'))
    renderPlanilla()
    await waitFor(() => {
      expect(screen.getByText(/no encontrada/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Planilla — filtros', () => {
  afterEach(() => vi.clearAllMocks())

  it('filtro Pendientes oculta partidos finalizados', async () => {
    const user = userEvent.setup()
    const matches = [makeMatch('m1', 'scheduled'), makeMatch('m2', 'finished')]
    await setupApi({ matches })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBe(2)
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /^Pendientes$/i }))
    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBe(1)
    })
  })

  it('filtro Finalizados oculta pendientes', async () => {
    const user = userEvent.setup()
    const matches = [makeMatch('m1', 'scheduled'), makeMatch('m2', 'finished')]
    await setupApi({ matches })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBe(2)
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /^Finalizados$/i }))
    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBe(1)
    })
  })
})
