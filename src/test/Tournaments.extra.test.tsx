import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

const T1 = { id: 't1', name: 'Mundial 2026', fase: 'Grupos', start_date: '2026-06-11', is_active: true }
const T2 = { id: 't2', name: 'Copa América', fase: 'Final', start_date: '2026-07-01', is_active: true }

function makeMatch(id: string, estado: 'scheduled' | 'finished' = 'scheduled', tId = 't1') {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, tournament_id: tId,
    resultado_local: estado === 'finished' ? 2 : null,
    resultado_visitante: estado === 'finished' ? 1 : null,
    start_time: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    time_cutoff: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    grupo: 'A', jornada: 1,
  }
}

const RANKING = [
  { user_id: 'u1', user_name: 'Carlos', puntos: 15, total_aciertos: 4, total_exactos: 2, posicion: 1 },
  { user_id: 'u2', user_name: 'Ana', puntos: 10, total_aciertos: 3, total_exactos: 1, posicion: 2 },
]

async function setupApi(overrides: {
  tournaments?: unknown[]; matches?: unknown[]; ranking?: unknown[]; rejectMatches?: boolean
} = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/tournaments') return Promise.resolve({ data: { data: overrides.tournaments ?? [T1] } })
    if (url.startsWith('/matches')) {
      if (overrides.rejectMatches) return Promise.reject(new Error('network'))
      return Promise.resolve({ data: { data: { matches: overrides.matches ?? [makeMatch('m1')] } } })
    }
    if (url.includes('/ranking')) return Promise.resolve({ data: { data: overrides.ranking ?? RANKING } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderTournaments() {
  return render(<MemoryRouter><Tournaments /></MemoryRouter>)
}

describe('Tournaments — selector de torneo', () => {
  afterEach(() => vi.clearAllMocks())

  it('con 1 torneo no muestra selector', async () => {
    await setupApi({ tournaments: [T1] })
    renderTournaments()
    await waitFor(() => expect(screen.getByText('Mundial 2026')).toBeInTheDocument(), { timeout: 3000 })
    // No aparece un segundo botón de torneo
    expect(screen.queryByText('Copa América')).toBeNull()
  })

  it('con 2 torneos muestra selector y permite cambiar', async () => {
    const user = userEvent.setup()
    await setupApi({ tournaments: [T1, T2], matches: [makeMatch('m1', 'scheduled', 't1')] })
    renderTournaments()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mundial 2026' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Copa América' })).toBeInTheDocument()
    }, { timeout: 3000 })

    // Click en Copa América lo selecciona
    await user.click(screen.getByRole('button', { name: 'Copa América' }))
    await waitFor(() => {
      // Copa América sigue visible (no crashea)
      expect(screen.getByRole('button', { name: 'Copa América' })).toBeInTheDocument()
    })
  })
})

describe('Tournaments — partidos finalizados', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra sección Finalizados cuando hay partidos terminados', async () => {
    await setupApi({ matches: [makeMatch('m1', 'finished')] })
    renderTournaments()
    await waitFor(() => {
      expect(screen.getByText(/Finalizados/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra sección Próximos cuando hay partidos pendientes', async () => {
    await setupApi({ matches: [makeMatch('m1', 'scheduled')] })
    renderTournaments()
    await waitFor(() => {
      expect(screen.getByText(/Próximos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Tournaments — mi posición en torneo', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra la posición del usuario logueado en el torneo', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderTournaments()

    await waitFor(() => {
      expect(screen.getByText(/🏆 Ranking/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText(/🏆 Ranking/i))
    await waitFor(() => {
      // Carlos está en el ranking, debe mostrar (vos)
      expect(screen.getByText(/\(vos\)/i)).toBeInTheDocument()
    })
  })
})

describe('Tournaments — manejo de errores', () => {
  afterEach(() => vi.clearAllMocks())

  it('error al cargar /matches no rompe la página', async () => {
    await setupApi({ rejectMatches: true })
    renderTournaments()
    await waitFor(() => {
      // Sin partidos pero la página sigue en pie
      expect(screen.getByText(/Torneos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('error al cargar /tournaments muestra mensaje de sin activos', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/tournaments') return Promise.reject(new Error('network'))
      return Promise.resolve({ data: { data: [] } })
    })
    renderTournaments()
    await waitFor(() => {
      expect(screen.getByText(/No hay torneos activos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})
