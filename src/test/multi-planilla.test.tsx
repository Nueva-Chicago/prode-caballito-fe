import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Apuestas } from '@/pages/Apuestas'
import { Matriz } from '@/pages/Matriz'

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
  MatchCard: ({ match }: { match: { id: string; home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLANILLA_1 = { id: 'p1', user_id: 'u1', nombre_planilla: 'Planilla 1', precio_pagado: false }
const PLANILLA_2 = { id: 'p2', user_id: 'u1', nombre_planilla: 'Planilla 2', precio_pagado: false }

function makeMatch(id: string) {
  const future = new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado: 'scheduled', finished: false,
    resultado_local: null, resultado_visitante: null,
    time_cutoff: future, start_time: future, halftime_minutes: 0,
  }
}

// ─── Apuestas — múltiples planillas del mismo usuario ─────────────────────────

describe('Apuestas — múltiples planillas del mismo usuario', () => {
  afterEach(() => vi.clearAllMocks())

  async function setupApuestasApi(planillas: unknown[]) {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [makeMatch('m1')] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: planillas } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })
  }

  it('selector muestra "Planilla 1" y "Planilla 2" cuando el usuario tiene dos planillas', async () => {
    await setupApuestasApi([PLANILLA_1, PLANILLA_2])
    render(<MemoryRouter><Apuestas /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('Planilla 1')).toBeInTheDocument()
      expect(screen.getByText('Planilla 2')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('crear segunda planilla → API retorna "Planilla 2" y aparece en el selector', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: PLANILLA_2 } })

    await setupApuestasApi([PLANILLA_1])
    render(<MemoryRouter><Apuestas /></MemoryRouter>)

    await waitFor(() => expect(screen.getByTitle(/Nueva planilla/i)).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByTitle(/Nueva planilla/i))
    await user.click(screen.getByRole('button', { name: /Crear planilla/i }))

    await waitFor(() => {
      expect(screen.getByText('Planilla 2')).toBeInTheDocument()
    })
  })

  it('cambiar planilla en selector carga las apuestas de la planilla seleccionada', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')

    await setupApuestasApi([PLANILLA_1, PLANILLA_2])
    render(<MemoryRouter><Apuestas /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getByText('Planilla 1')).toBeInTheDocument()
    }, { timeout: 3000 })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'p2')

    await waitFor(() => {
      const getCalls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c: any) => c[0] as string)
      const betsP2 = getCalls.filter((url: string) => url.includes('/bets/planillas/p2'))
      expect(betsP2.length).toBeGreaterThan(0)
    })
  })
})

// ─── Matriz — mismo usuario con dos planillas ──────────────────────────────────

describe('Matriz — mismo usuario con dos planillas', () => {
  afterEach(() => vi.clearAllMocks())

  const ROW_CARLOS_1 = {
    planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos',
    nombre_planilla: 'Planilla 1', puntos_totales: 10, position: 1, precio_pagado: true,
  }
  const ROW_CARLOS_2 = {
    planilla_id: 'p2', user_id: 'u1', user_name: 'Carlos',
    nombre_planilla: 'Planilla 2', puntos_totales: 5, position: 2, precio_pagado: false,
  }
  const ROW_ANA = {
    planilla_id: 'p3', user_id: 'u2', user_name: 'Ana',
    nombre_planilla: 'Planilla 1', puntos_totales: 8, position: 3, precio_pagado: true,
  }

  const MATCH_FINISHED = {
    id: 'mf1', home_team: 'HomeF', away_team: 'AwayF',
    estado: 'finished', resultado_local: 2, resultado_visitante: 1,
    start_time: new Date(Date.now() - 4 * 3600000).toISOString(),
    time_cutoff: new Date(Date.now() - 4 * 3600000).toISOString(),
    halftime_minutes: 90,
  }

  async function setupMatrizApi(rows: unknown[]) {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('favorites')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/ranking') || url.includes('/planillas')) return Promise.resolve({ data: { data: { ranking: rows } } })
      if (url.includes('/matches')) return Promise.resolve({ data: { data: { matches: [MATCH_FINISHED] } } })
      if (url.includes('/matriz')) return Promise.resolve({ data: { data: { bets: {}, ranking: rows } } })
      return Promise.resolve({ data: { data: [] } })
    })
  }

  it('muestra dos filas para Carlos cuando tiene dos planillas', async () => {
    await setupMatrizApi([ROW_CARLOS_1, ROW_CARLOS_2, ROW_ANA])
    render(<MemoryRouter><Matriz /></MemoryRouter>)

    await waitFor(() => {
      const carlosRows = screen.getAllByText('Carlos')
      expect(carlosRows.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 3000 })
  })

  it('muestra nombre_planilla de cada planilla para distinguirlas', async () => {
    await setupMatrizApi([ROW_CARLOS_1, ROW_CARLOS_2, ROW_ANA])
    render(<MemoryRouter><Matriz /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getAllByText('Carlos').length).toBeGreaterThanOrEqual(2)
    }, { timeout: 3000 })

    // "Planilla 2" aparece solo en la segunda fila de Carlos
    const p2Labels = screen.queryAllByText('Planilla 2')
    expect(p2Labels.length).toBeGreaterThan(0)
  })

  it('planilla no pagada de Carlos muestra badge IMPAGA', async () => {
    await setupMatrizApi([ROW_CARLOS_1, ROW_CARLOS_2, ROW_ANA])
    render(<MemoryRouter><Matriz /></MemoryRouter>)

    await waitFor(() => {
      expect(screen.getAllByText('Carlos').length).toBeGreaterThanOrEqual(2)
    }, { timeout: 3000 })

    // ROW_CARLOS_2 tiene precio_pagado: false → badge IMPAGA visible
    const impagaLabels = screen.queryAllByText(/IMPAGA/i)
    expect(impagaLabels.length).toBeGreaterThan(0)
  })
})
