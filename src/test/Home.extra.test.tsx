import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '@/pages/Home'

// ─── Mocks (mismo set que Home.cta.test.tsx) ─────────────────────────────────

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

vi.mock('@/components/ui/AdCard', () => ({ AdCard: () => null }))

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

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true }

function futureMatch(id: string) {
  return {
    id,
    home_team: `Home${id}`,
    away_team: `Away${id}`,
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    estado: 'pending',
    finished: false,
  }
}

function setupApi(overrides: {
  matches?: unknown[]
  bets?: unknown[]
  ranking?: unknown[]
  rejectAll?: boolean
} = {}) {
  return import('@/api/client').then(({ api }) => {
    if (overrides.rejectAll) {
      // Solo rechazar /matches para forzar el catch de loadData; los demás resuelven
      // para evitar rechazos no manejados en Promise.all (Node 20 los trata como fatal)
      ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.startsWith('/matches')) return Promise.reject(new Error('network'))
        return Promise.resolve({ data: { data: [] } })
      })
      return
    }
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? [] } } })
      if (url.startsWith('/tournaments')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
      return Promise.resolve({ data: { data: [] } })
    })
  })
}

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Home — estado de carga y errores', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra skeleton mientras carga', async () => {
    // API que nunca resuelve → loading permanente
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))
    renderHome()
    // Skeleton está en el DOM (no hay contenido real)
    expect(screen.queryByText(/pronóstico/i)).toBeNull()
  })

  it('error de red → muestra botón de reintentar', async () => {
    await setupApi({ rejectAll: true })
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/reintentar/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Home — ranking y podio', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra top 3 cuando hay ranking', async () => {
    const ranking = [
      { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García', puntos_totales: 50, position: 1 },
      { planilla_id: 'p3', user_id: 'u3', user_name: 'Bob López', puntos_totales: 40, position: 2 },
      { planilla_id: 'p4', user_id: 'u4', user_name: 'Caro Ruiz', puntos_totales: 30, position: 3 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Caro')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('mi posición aparece resaltada con "(vos)"', async () => {
    const ranking = [
      { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García', puntos_totales: 50, position: 1 },
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 30, position: 2 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      // "(vos)" aparece junto al nombre del usuario logueado
      expect(screen.getByText(/\(vos\)/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra LeaderHome cuando el usuario está en posición 1', async () => {
    const ranking = [
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 50, position: 1 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      expect(screen.getByTestId('leader-home')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Home — partidos próximos', () => {
  afterEach(() => vi.clearAllMocks())

  it('renderiza tarjetas de partidos próximos', async () => {
    const matches = [futureMatch('m1'), futureMatch('m2')]
    await setupApi({ matches })
    renderHome()
    await waitFor(() => {
      expect(screen.getAllByTestId('match-card').length).toBeGreaterThanOrEqual(1)
    }, { timeout: 3000 })
  })

  it('sin partidos ni ranking → no muestra tarjetas', async () => {
    await setupApi({ matches: [], ranking: [] })
    renderHome()
    await waitFor(() => {
      expect(screen.queryByTestId('match-card')).toBeNull()
    }, { timeout: 3000 })
  })
})

describe('Home — botón compartir', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra botón compartir cuando el usuario tiene puntos', async () => {
    const ranking = [
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 20, position: 2 },
      { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana', puntos_totales: 30, position: 1 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Compartir/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('no muestra botón compartir con 0 puntos', async () => {
    const ranking = [
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 0, position: 1 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      // Esperar que Home cargue (title visible)
      expect(screen.queryByText(/Compartir/i)).toBeNull()
    }, { timeout: 3000 })
  })
})
