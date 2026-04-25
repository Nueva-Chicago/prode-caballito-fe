import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  useToastStore: () => ({ addToast: vi.fn(), show: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({ state: { type: 'unavailable' }, install: vi.fn() }),
}))

vi.mock('@/components/ui/AdCard', () => ({
  AdCard: () => null,
}))

vi.mock('@/pages/LeaderHome', () => ({
  LeaderHome: () => <div data-testid="leader-home" />,
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({}),
  getTeamBadge: () => null,
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cutoff 3 days from now — open and not urgent */
function futureCutoff(hoursFromNow = 72) {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString()
}

/** A pending match that closes far in the future (no urgency) */
function makeMatch(id: string, overrides: Partial<{
  estado: string
  time_cutoff: string
}> = {}) {
  return {
    id,
    home_team: `Home${id}`,
    away_team: `Away${id}`,
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    time_cutoff: overrides.time_cutoff ?? futureCutoff(72),
    halftime_minutes: 0,
    estado: overrides.estado ?? 'pending',
    finished: overrides.estado === 'finished',
  }
}

/** A pending match closing in 2h (urgent — within 6h window) */
function makeUrgentMatch(id: string) {
  return makeMatch(id, { time_cutoff: futureCutoff(2) })
}

function makeBet(matchId: string) {
  return { id: `bet-${matchId}`, planilla_id: 'p1', match_id: matchId, goles_local: 1, goles_visitante: 0 }
}

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true }

function setupApiMock(matches: ReturnType<typeof makeMatch>[], bets: ReturnType<typeof makeBet>[]) {
  return async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: bets } })
      return Promise.resolve({ data: { data: [] } })
    })
  }
}

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Home — CTA pronósticos pendientes', () => {
  afterEach(() => vi.clearAllMocks())

  it('no muestra el banner cuando todos los partidos tienen apuesta', async () => {
    const matches = [makeMatch('m1'), makeMatch('m2')]
    const bets = [makeBet('m1'), makeBet('m2')]
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.queryByText(/Tenés \d+ pronóstico/i)).toBeNull()
    }, { timeout: 3000 })
  })

  it('muestra banner cuando hay pendientes sin urgencia', async () => {
    const matches = [makeMatch('m1'), makeMatch('m2'), makeMatch('m3')]
    const bets = [makeBet('m1')] // m2 y m3 sin apuesta → totalUnbet = 2
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 2 pronósticos pendientes esta semana')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('Completar ahora →')).toBeInTheDocument()
    expect(screen.queryByText(/cierra pronto/i)).toBeNull()
  })

  it('muestra texto urgente cuando hay partidos que cierran pronto sin apuesta', async () => {
    const urgentMatch = makeUrgentMatch('urgent1')
    const normalMatch = makeMatch('normal1')
    const matches = [urgentMatch, normalMatch]
    const bets: ReturnType<typeof makeBet>[] = []
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 2 pronósticos pendientes esta semana')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('⚠️ 1 partido cierra pronto sin tu apuesta')).toBeInTheDocument()
  })

  it('no cuenta partidos finalizados como pendientes', async () => {
    const matches = [
      makeMatch('m1', { estado: 'finished' }),
      makeMatch('m2', { estado: 'finished' }),
      makeMatch('m3'),
    ]
    const bets: ReturnType<typeof makeBet>[] = []
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 1 pronóstico pendiente esta semana')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('el banner contiene link a /apuestas', async () => {
    const matches = [makeMatch('m1')]
    const bets: ReturnType<typeof makeBet>[] = []
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 1 pronóstico pendiente esta semana')).toBeInTheDocument()
    }, { timeout: 3000 })

    const link = screen.getByText('Completar ahora →').closest('a')
    expect(link).toHaveAttribute('href', '/apuestas')
  })

  it('singular correcto: "1 pronóstico" sin pluralizar', async () => {
    const matches = [makeMatch('m1')]
    const bets: ReturnType<typeof makeBet>[] = []
    await setupApiMock(matches, bets)()

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Tenés 1 pronóstico pendiente esta semana')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByText(/1 pronósticos/)).toBeNull()
  })
})
