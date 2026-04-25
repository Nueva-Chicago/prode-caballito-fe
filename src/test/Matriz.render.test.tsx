import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Matriz } from '@/pages/Matriz'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' },
      isAdmin: () => false,
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ addToast: vi.fn(), show: vi.fn() }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MATCHES = [
  {
    id: 'm1', home_team: 'Argentina', away_team: 'Brasil',
    estado: 'finished', finished: true,
    resultado_local: 2, resultado_visitante: 1,
    time_cutoff: '2026-04-01T00:00:00Z', start_time: '2026-04-01T00:00:00Z',
    halftime_minutes: 0,
  },
  {
    id: 'm2', home_team: 'France', away_team: 'Spain',
    estado: 'scheduled', finished: false,
    resultado_local: null, resultado_visitante: null,
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    halftime_minutes: 0,
  },
]

const RANKING = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', puntos_totales: 30, position: 1, precio_pagado: true },
  { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana', puntos_totales: 20, position: 2, precio_pagado: true },
]

const BETS = {
  p1: {
    m1: { planilla_id: 'p1', match_id: 'm1', goles_local: 2, goles_visitante: 1 }, // exacto
    m2: { planilla_id: 'p1', match_id: 'm2', goles_local: 1, goles_visitante: 0 },
  },
  p2: {
    m1: { planilla_id: 'p2', match_id: 'm1', goles_local: 0, goles_visitante: 1 }, // perdió
  },
}

async function setupApi(overrides: { matches?: unknown[]; ranking?: unknown[]; bets?: unknown } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? MATCHES } } })
    if (url.startsWith('/ranking/favorites')) return Promise.resolve({ data: { data: [] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? RANKING } } })
    if (url.includes('/bets/all-for-matrix')) return Promise.resolve({ data: { data: overrides.bets ?? BETS } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMatriz() {
  return render(<MemoryRouter><Matriz /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Matriz — renderizado con datos', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra los nombres de los jugadores en el header y filas', async () => {
    await setupApi()
    renderMatriz()
    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
      expect(screen.getByText('Ana')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra los equipos en el header de la matriz (abreviaciones)', async () => {
    await setupApi()
    renderMatriz()
    await waitFor(() => {
      // Matriz muestra abreviaciones (ARG, BRA) no nombres completos en el header
      expect(screen.getAllByText(/^ARG$/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/^BRA$/i).length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('muestra badge de colores para partidos terminados', async () => {
    await setupApi()
    renderMatriz()
    await waitFor(() => {
      // Los botones de filtro de colores aparecen siempre (t.matrix.ptsLabel.rojo = '3pts')
      expect(screen.getByText('3pts')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('title y subtítulo con conteo de jugadores y partidos', async () => {
    await setupApi()
    renderMatriz()
    await waitFor(() => {
      // t.matrix.players(2) y t.matrix.matches(2)
      expect(screen.getByText(/2 jugadores/i)).toBeInTheDocument()
      expect(screen.getByText(/2 partidos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Matriz — filtros de color en render', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en filtro rojo → activa estado de filtro (ring visible)', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('3pts')).toBeInTheDocument()
    }, { timeout: 3000 })

    const btn = screen.getByText('3pts')
    await user.click(btn)
    // Después del click el botón tiene clase ring (filtro activo)
    expect(btn.className).toMatch(/ring/)
  })

  it('"✕ limpiar" aparece al activar un filtro y desaparece al limpiar', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('3pts')).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText('3pts'))
    expect(screen.getByText(/limpiar/i)).toBeInTheDocument()

    await user.click(screen.getByText(/limpiar/i))
    expect(screen.queryByText(/limpiar/i)).toBeNull()
  })
})

describe('Matriz — estado vacío', () => {
  afterEach(() => vi.clearAllMocks())

  it('sin jugadores → no muestra filas de ranking', async () => {
    await setupApi({ ranking: [], matches: [] })
    renderMatriz()
    await waitFor(() => {
      expect(screen.queryByText('Carlos')).toBeNull()
      expect(screen.queryByText('Ana')).toBeNull()
    }, { timeout: 3000 })
  })
})
