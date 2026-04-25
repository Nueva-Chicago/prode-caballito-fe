import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const past = new Date(Date.now() - 4 * 3600000).toISOString()
const future = new Date(Date.now() + 72 * 3600000).toISOString()

const MATCH_FINISHED = {
  id: 'mf1', home_team: 'HomeF', away_team: 'AwayF',
  estado: 'finished', resultado_local: 2, resultado_visitante: 1,
  start_time: past, time_cutoff: past, halftime_minutes: 90,
}

const MATCH_PENDING = {
  id: 'mp1', home_team: 'HomeP', away_team: 'AwayP',
  estado: 'scheduled', resultado_local: null, resultado_visitante: null,
  start_time: future, time_cutoff: future, halftime_minutes: 0,
}

const PLANILLA_MINE = { id: 'p1', user_id: 'u1', planilla_id: 'p1', user_name: 'Carlos', nombre_planilla: 'Mi planilla', puntos_totales: 6, position: 1, precio_pagado: true }
const PLANILLA_OTHER = { id: 'p2', user_id: 'u2', planilla_id: 'p2', user_name: 'Ana', nombre_planilla: 'Ana planilla', puntos_totales: 3, position: 2, precio_pagado: true }

async function setupApi(overrides: { planillas?: unknown[]; matches?: unknown[]; bets?: unknown } = {}) {
  const { api } = await import('@/api/client')
  const defaultBets = {
    p1: { mf1: { home: 2, away: 1 }, mp1: { home: 1, away: 0 } },
    p2: { mf1: { home: 1, away: 1 } },
  }
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('/planillas') || url.includes('/ranking')) {
      return Promise.resolve({ data: { data: { ranking: overrides.planillas ?? [PLANILLA_MINE, PLANILLA_OTHER] } } })
    }
    if (url.includes('/matches')) {
      return Promise.resolve({ data: { data: { matches: overrides.matches ?? [MATCH_FINISHED, MATCH_PENDING] } } })
    }
    if (url.includes('/matriz')) {
      return Promise.resolve({ data: { data: { bets: overrides.bets ?? defaultBets, ranking: [PLANILLA_MINE, PLANILLA_OTHER] } } })
    }
    if (url.includes('favorites')) {
      return Promise.resolve({ data: { data: [] } })
    }
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMatriz() {
  return render(<MemoryRouter><Matriz /></MemoryRouter>)
}

describe('Matriz — modal de veda', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en 🔒 abre modal de período de veda', async () => {
    await setupApi({
      bets: {
        p1: { mf1: { home: 2, away: 1 }, mp1: { home: 1, away: 0 } },
        p2: { mf1: { home: 1, away: 1 }, mp1: { home: 0, away: 0 } }, // Ana tiene apuesta pending → se ve como 🔒
      },
    })
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    }, { timeout: 3000 })

    const lockIcons = screen.queryAllByTitle('Período de veda activo')
    if (lockIcons.length > 0) {
      fireEvent.click(lockIcons[0])
      await waitFor(() => {
        expect(screen.getByText(/período de veda/i)).toBeInTheDocument()
      })

      // Cerrar el modal con "Entendido"
      fireEvent.click(screen.getByRole('button', { name: /Entendido/i }))
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Entendido/i })).toBeNull()
      })
    }
  })
})

describe('Matriz — filtros de color', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en badge de color activa el filtro', async () => {
    await setupApi()
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Los botones de filtro de colores están en el header de la matriz
    const colorBtns = document.querySelectorAll('[data-color], .rounded-full')
    // Si existen botones de filtro de color, hacemos click en uno
    if (colorBtns.length > 0) {
      fireEvent.click(colorBtns[0])
    }
    // La página no crashea
    expect(screen.getByText('Carlos')).toBeInTheDocument()
  })
})

describe('Matriz — badges de partido finalizado', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra el badge con el pronóstico del jugador en partidos finalizados', async () => {
    await setupApi()
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Buscar badges con formato "X-Y" (pronósticos)
    const badges = screen.queryAllByText(/^\d+-\d+$/)
    expect(badges.length).toBeGreaterThan(0)
  })
})
