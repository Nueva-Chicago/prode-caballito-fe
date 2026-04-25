import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true, puntos_totales: 15, exactos_count: 3 }

function makeFinishedMatch(id: string) {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado: 'finished' as const, finished: true,
    resultado_local: 2, resultado_visitante: 1,
    time_cutoff: new Date(Date.now() - 3600 * 1000).toISOString(),
    start_time: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    halftime_minutes: 90,
  }
}

function makePendingMatch(id: string) {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado: 'scheduled' as const, finished: false,
    resultado_local: null, resultado_visitante: null,
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    halftime_minutes: 0,
  }
}

async function setupApi(overrides: { planilla?: unknown; matches?: unknown[]; bets?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/planillas/')) return Promise.resolve({ data: { data: overrides.planilla ?? PLANILLA } })
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: overrides.matches ?? [] } } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: overrides.bets ?? [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderPlanilla(planillaId = 'p1') {
  return render(
    <MemoryRouter initialEntries={[`/planilla/${planillaId}`]}>
      <Routes><Route path="/planilla/:planillaId" element={<Planilla />} /></Routes>
    </MemoryRouter>
  )
}

describe('Planilla — distribución de puntajes', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra badges de colores cuando hay apuestas con puntos', async () => {
    const bets = [
      { id: 'b1', match_id: 'mf1', goles_local: 2, goles_visitante: 1, puntos_obtenidos: 4 }, // celeste
      { id: 'b2', match_id: 'mf2', goles_local: 1, goles_visitante: 0, puntos_obtenidos: 3 }, // rojo
      { id: 'b3', match_id: 'mf3', goles_local: 0, goles_visitante: 0, puntos_obtenidos: 2 }, // verde
    ]
    const matches = [makeFinishedMatch('mf1'), makeFinishedMatch('mf2'), makeFinishedMatch('mf3')]
    await setupApi({ matches, bets })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Los badges de distribución deben existir (formato "N× Xpts")
    // Puede haber múltiples coincidencias por la etiqueta "Exactos (≥3pts)" en stats
    expect(screen.getAllByText(/4pts/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/3pts/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2pts/).length).toBeGreaterThan(0)
    // El header de la sección de distribución confirma que se renderizó
    expect(screen.getByText(/Distribución de puntajes/i)).toBeInTheDocument()
  })

  it('muestra barra de progreso cuando hay partidos pendientes con apuestas', async () => {
    const bets = [
      { id: 'b1', match_id: 'mp1', goles_local: 1, goles_visitante: 0, puntos_obtenidos: 0 },
    ]
    const matches = [makePendingMatch('mp1'), makePendingMatch('mp2')]
    await setupApi({ matches, bets })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })

    // "1/2" aparece tanto en el stats-grid como en la barra de progreso
    await waitFor(() => {
      expect(screen.getAllByText('1/2').length).toBeGreaterThan(0)
    })
  })

  it('no muestra sección distribución cuando no hay apuestas', async () => {
    await setupApi({ matches: [makeFinishedMatch('mf1')], bets: [] })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByText(/Distribución de puntajes/i)).toBeNull()
  })
})

describe('Planilla — indicador no oficial', () => {
  afterEach(() => vi.clearAllMocks())

  it('planilla no pagada muestra aviso de no aparece en ranking', async () => {
    await setupApi({ planilla: { ...PLANILLA, precio_pagado: false } })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText(/No aparece en el ranking oficial/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('planilla pagada no muestra el aviso de no oficial', async () => {
    await setupApi({ planilla: { ...PLANILLA, precio_pagado: true } })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.queryByText(/No aparece en el ranking oficial/i)).toBeNull()
  })
})

describe('Planilla — apuestas con 0 y 1 punto', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra badge amarillo (1pt) y gris (0pts)', async () => {
    const bets = [
      { id: 'b1', match_id: 'mf1', goles_local: 1, goles_visitante: 0, puntos_obtenidos: 1 }, // amarillo
      { id: 'b2', match_id: 'mf2', goles_local: 0, goles_visitante: 0, puntos_obtenidos: 0 }, // gris
    ]
    const matches = [makeFinishedMatch('mf1'), makeFinishedMatch('mf2')]
    await setupApi({ matches, bets })
    renderPlanilla()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText(/1pt/)).toBeInTheDocument()
    expect(screen.getByText(/0pts/)).toBeInTheDocument()
  })
})
