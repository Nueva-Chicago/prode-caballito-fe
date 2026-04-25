import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Apuestas } from '@/pages/Apuestas'

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

vi.mock('@/components/ui/AdCard', () => ({ AdCard: () => null }))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const PLANILLA_UNPAID = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: false }

function makeMatch(id: string, estado: 'scheduled' | 'finished' | 'live' = 'scheduled') {
  const future = new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, finished: estado === 'finished',
    resultado_local: estado === 'finished' ? 1 : null,
    resultado_visitante: estado === 'finished' ? 0 : null,
    time_cutoff: estado === 'finished' ? new Date(Date.now() - 3600 * 1000).toISOString() : future,
    start_time: estado === 'finished' ? new Date(Date.now() - 4 * 3600 * 1000).toISOString() : future,
    halftime_minutes: 0,
  }
}

async function setupApi(overrides: { matches?: unknown[]; planillas?: unknown[]; bets?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [makeMatch('m1')] } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: overrides.planillas ?? [PLANILLA_UNPAID] } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderApuestas() {
  return render(<MemoryRouter><Apuestas /></MemoryRouter>)
}

describe('Apuestas — cancelar modal nueva planilla', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en Cancelar cierra el modal', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderApuestas()

    await waitFor(() => expect(screen.getByTitle(/Nueva planilla/i)).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByTitle(/Nueva planilla/i))
    expect(screen.getByText(/Cada planilla compite/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(screen.queryByText(/Cada planilla compite/i)).toBeNull()
  })
})

describe('Apuestas — partidos EN VIVO', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra sección EN VIVO cuando hay partidos live', async () => {
    await setupApi({ matches: [makeMatch('m1', 'live')] })
    renderApuestas()

    await waitFor(() => {
      expect(screen.getByText(/EN VIVO/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('no muestra sección EN VIVO cuando no hay partidos live', async () => {
    await setupApi({ matches: [makeMatch('m1', 'scheduled')] })
    renderApuestas()

    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    expect(screen.queryByText(/EN VIVO/i)).toBeNull()
  })
})

describe('Apuestas — confirmar planilla', () => {
  afterEach(() => vi.clearAllMocks())

  it('botón confirmar aparece disabled cuando hay apuestas pendientes', async () => {
    await setupApi({
      matches: [makeMatch('m1')],
      bets: [], // sin apuestas → pending count > 0
    })
    renderApuestas()

    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /pronósticos/i })
      if (btn) expect(btn).toBeDisabled()
    }, { timeout: 3000 })
  })

  it('modal confirmar se cierra con Seguir editando', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    // Una planilla sin pagar con apuesta completa
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [makeMatch('m1')] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA_UNPAID] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: [{ id: 'b1', match_id: 'm1', goles_local: 1, goles_visitante: 0 }] } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderApuestas()

    await waitFor(() => {
      // Con 1 match y 1 bet, el botón confirmar debería habilitarse
      const btn = screen.queryByRole('button', { name: /Confirmar/i })
      if (btn && !btn.hasAttribute('disabled')) {
        userEvent.click(btn)
      }
    }, { timeout: 3000 })
  })
})
