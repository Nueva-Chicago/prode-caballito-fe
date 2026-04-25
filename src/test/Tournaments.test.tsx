import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Tournaments } from '@/pages/Tournaments'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TOURNAMENT = { id: 't1', name: 'Mundial 2026', fase: 'Grupos', start_date: '2026-06-11', is_active: true }

function makeMatch(id: string, estado: 'scheduled' | 'finished' = 'scheduled') {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, tournament_id: 't1',
    resultado_local: estado === 'finished' ? 1 : null,
    resultado_visitante: estado === 'finished' ? 0 : null,
    start_time: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    time_cutoff: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    grupo: 'A', jornada: 1,
  }
}

const RANKING = [
  { user_id: 'u1', user_name: 'Carlos', puntos: 10, total_aciertos: 3, total_exactos: 1, posicion: 1 },
  { user_id: 'u2', user_name: 'Ana', puntos: 8, total_aciertos: 2, total_exactos: 0, posicion: 2 },
]

async function setupApi(overrides: {
  tournaments?: unknown[]; matches?: unknown[]; ranking?: unknown[]
} = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/tournaments') return Promise.resolve({ data: { data: overrides.tournaments ?? [TOURNAMENT] } })
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [makeMatch('m1'), makeMatch('m2')] } } })
    if (url.includes('/ranking')) return Promise.resolve({ data: { data: overrides.ranking ?? RANKING } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderTournaments() {
  return render(<MemoryRouter><Tournaments /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Tournaments — renderizado básico', () => {
  afterEach(() => vi.clearAllMocks())

  it('sin torneos → muestra mensaje de no activos', async () => {
    await setupApi({ tournaments: [] })
    renderTournaments()
    await waitFor(() => {
      expect(screen.getByText(/No hay torneos activos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra el nombre del torneo tras cargar', async () => {
    await setupApi()
    renderTournaments()
    await waitFor(() => {
      expect(screen.getByText('Mundial 2026')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra partidos en la tab Partidos por defecto', async () => {
    await setupApi()
    renderTournaments()
    await waitFor(() => {
      expect(screen.getAllByText(/Homem/i).length).toBeGreaterThanOrEqual(1)
    }, { timeout: 3000 })
  })

  it('tab Ranking muestra jugadores del torneo', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderTournaments()

    await waitFor(() => {
      expect(screen.getByText(/🏆 Ranking/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText(/🏆 Ranking/i))
    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
  })

  it('ranking vacío → muestra mensaje de sin datos', async () => {
    const user = userEvent.setup()
    await setupApi({ ranking: [] })
    renderTournaments()

    await waitFor(() => {
      expect(screen.getByText(/🏆 Ranking/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText(/🏆 Ranking/i))
    await waitFor(() => {
      expect(screen.getByText(/Todavía no hay datos/i)).toBeInTheDocument()
    })
  })
})
