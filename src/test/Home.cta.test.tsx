import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '@/pages/Home'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}))

// Silence applyTheme / CSS vars in jsdom
vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

// Mock MatchCard so we don't need to render the full beast
vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-18T12:00:00Z')

/** A pending match that closes far in the future (no urgency) */
function makeMatch(id: string, overrides: Partial<{
  estado: 'pending' | 'live' | 'finished'
  time_cutoff: string
}> = {}) {
  return {
    id,
    home_team: `Home${id}`,
    away_team: `Away${id}`,
    start_time: '2026-04-19T18:00:00Z',
    time_cutoff: overrides.time_cutoff ?? '2026-04-19T17:00:00Z', // ~29h away
    halftime_minutes: 0,
    estado: overrides.estado ?? 'pending',
    finished: overrides.estado === 'finished',
  }
}

/** A pending match closing in <6h (urgent) */
function makeUrgentMatch(id: string) {
  const cutoff = new Date(NOW.getTime() + 2 * 3600 * 1000).toISOString() // 2h from now
  return makeMatch(id, { time_cutoff: cutoff })
}

function makeBet(matchId: string) {
  return {
    id: `bet-${matchId}`,
    planilla_id: 'p1',
    match_id: matchId,
    goles_local: 1,
    goles_visitante: 0,
  }
}

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true }

// ─── API mock factory ─────────────────────────────────────────────────────────

function mockApi(matches: ReturnType<typeof makeMatch>[], bets: ReturnType<typeof makeBet>[]) {
  const { api } = vi.mocked(await import('@/api/client'))
  api.get = vi.fn((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
    if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
    return Promise.resolve({ data: { data: [] } })
  })
}

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home — CTA pronósticos pendientes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('no muestra el banner cuando todos los partidos tienen apuesta', async () => {
    const matches = [makeMatch('m1'), makeMatch('m2')]
    const bets = [makeBet('m1'), makeBet('m2')]
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()
    await waitFor(() => expect(screen.queryByText(/pronóstico/i)).not.toBeNull())

    // El banner de "pendientes" no debe aparecer
    expect(screen.queryByText(/Tenés/i)).toBeNull()
  })

  it('muestra banner ámbar cuando hay pendientes sin urgencia', async () => {
    const matches = [makeMatch('m1'), makeMatch('m2'), makeMatch('m3')]
    const bets = [makeBet('m1')] // m2 y m3 sin apuesta → totalUnbet = 2
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 2 pronósticos pendientes')).toBeInTheDocument()
    })

    // Botón CTA presente
    expect(screen.getByText('Completar ahora →')).toBeInTheDocument()

    // Sin mensaje de urgencia
    expect(screen.queryByText(/cierra pronto/i)).toBeNull()
  })

  it('muestra banner rojo con texto urgente cuando hay partidos que cierran pronto sin apuesta', async () => {
    const urgentMatch = makeUrgentMatch('urgent1')
    const normalMatch = makeMatch('normal1')
    const matches = [urgentMatch, normalMatch]
    const bets: ReturnType<typeof makeBet>[] = [] // ninguna apuesta

    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 2 pronósticos pendientes')).toBeInTheDocument()
    })

    // Texto urgente debe aparecer (1 partido cierra pronto)
    expect(screen.getByText('⚠️ 1 partido cierra pronto sin tu apuesta')).toBeInTheDocument()
  })

  it('no cuenta partidos finalizados como pendientes', async () => {
    const matches = [
      makeMatch('m1', { estado: 'finished' }),
      makeMatch('m2', { estado: 'finished' }),
      makeMatch('m3'), // único pendiente, sin apuesta
    ]
    const bets: ReturnType<typeof makeBet>[] = []
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()

    await waitFor(() => {
      // Solo 1 pendiente (m3)
      expect(screen.getByText('Tenés 1 pronóstico pendiente')).toBeInTheDocument()
    })
  })

  it('el banner es un link que lleva a /apuestas', async () => {
    const matches = [makeMatch('m1')]
    const bets: ReturnType<typeof makeBet>[] = []
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 1 pronóstico pendiente')).toBeInTheDocument()
    })

    const link = screen.getByText('Completar ahora →').closest('a')
    expect(link).toHaveAttribute('href', '/apuestas')
  })

  it('singular correcto: "1 pronóstico" (no "1 pronósticos")', async () => {
    const matches = [makeMatch('m1')]
    const bets: ReturnType<typeof makeBet>[] = []
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 1 pronóstico pendiente')).toBeInTheDocument()
    })
    // Plural no debe aparecer
    expect(screen.queryByText(/1 pronósticos/)).toBeNull()
  })
})
