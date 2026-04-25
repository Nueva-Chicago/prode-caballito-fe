import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LeaderHome } from '@/pages/LeaderHome'
import type { LeaderHomeProps } from '@/pages/LeaderHome'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos Pérez', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/components/ui/AdCard', () => ({
  AdCard: () => <div data-testid="ad-card" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(userId: string, pts: number, exactos = 2, pos = 1) {
  return {
    user_id: userId, user_name: userId === 'u1' ? 'Carlos Pérez' : `User ${userId}`,
    puntos_totales: pts, exactos_count: exactos, total_aciertos: exactos,
    total_exactos: exactos, posicion: pos, position: pos,
    planilla_id: `planilla-${userId}`,
    user_avatar: undefined,
  }
}

function makeMatch(id: string, estado: 'scheduled' | 'finished' = 'scheduled') {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, finished: estado === 'finished',
    resultado_local: estado === 'finished' ? 1 : null,
    resultado_visitante: estado === 'finished' ? 0 : null,
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    halftime_minutes: 0, tournament_id: 't1', grupo: 'A', jornada: 1,
  }
}

const MY_ENTRY = makeEntry('u1', 30, 5, 1)
const SECOND   = makeEntry('u2', 22, 3, 2)
const RANKING  = [MY_ENTRY, SECOND, makeEntry('u3', 18, 2, 3)]

function defaultProps(overrides: Partial<LeaderHomeProps> = {}): LeaderHomeProps {
  return {
    matches:      [makeMatch('m1'), makeMatch('m2')],
    bets:         {},
    onBetSaved:   vi.fn(),
    onBetDeleted: vi.fn(),
    ranking:      RANKING,
    myEntry:      MY_ENTRY,
    planilla:     { id: 'plan1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true, puntos_totales: 30, exactos_count: 5 },
    totalUnbet:   0,
    urgentUnbet:  0,
    ...overrides,
  }
}

function renderLeader(props: Partial<LeaderHomeProps> = {}) {
  return render(
    <MemoryRouter>
      <LeaderHome {...defaultProps(props)} />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LeaderHome — hero y stats', () => {
  it('muestra la corona y badge #1', () => {
    renderLeader()
    expect(screen.getByText('👑')).toBeInTheDocument()
    expect(screen.getByText(/LÍDER ABSOLUTO/i)).toBeInTheDocument()
  })

  it('muestra el nombre del usuario (primer nombre)', () => {
    renderLeader()
    expect(screen.getAllByText(/Carlos/).length).toBeGreaterThanOrEqual(1)
  })

  it('muestra los puntos totales del líder', () => {
    renderLeader()
    // puntos_totales = 30, aparece tanto en el sub-headline como en stats
    expect(screen.getAllByText('30').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra la ventaja sobre el 2°', () => {
    renderLeader()
    // lead = 30 - 22 = 8 → "+8 sobre el 2°"
    expect(screen.getAllByText(/\+8/).length).toBeGreaterThanOrEqual(1)
  })

  it('muestra los 4 stat cards (POSICIÓN, PUNTOS, VENTAJA, EXACTOS)', () => {
    renderLeader()
    expect(screen.getByText('POSICIÓN')).toBeInTheDocument()
    expect(screen.getByText('PUNTOS')).toBeInTheDocument()
    expect(screen.getByText('VENTAJA')).toBeInTheDocument()
    expect(screen.getByText('EXACTOS')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('sin 2° en ranking → ventaja muestra "—"', () => {
    renderLeader({ ranking: [MY_ENTRY] })
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('LeaderHome — CTAs de apuestas', () => {
  it('sin pendientes → muestra link "Ver ranking completo"', () => {
    renderLeader({ totalUnbet: 0 })
    expect(screen.getByRole('link', { name: /Ver ranking completo/i })).toBeInTheDocument()
  })

  it('con pendientes sin urgencia → muestra "Defender el #1"', () => {
    renderLeader({ totalUnbet: 3, urgentUnbet: 0 })
    expect(screen.getByRole('link', { name: /Defender el #1/i })).toBeInTheDocument()
  })

  it('con urgentes → muestra "urgente" y texto de alerta', () => {
    renderLeader({ totalUnbet: 2, urgentUnbet: 2 })
    expect(screen.getAllByRole('link', { name: /urgente/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/cierran pronto/i)).toBeInTheDocument()
  })

  it('1 urgente → texto singular "1 urgente"', () => {
    renderLeader({ totalUnbet: 1, urgentUnbet: 1 })
    expect(screen.getByRole('link', { name: /1 urgente/i })).toBeInTheDocument()
  })

  it('con pendientes → también aparece el banner CTA secundario', () => {
    renderLeader({ totalUnbet: 2, urgentUnbet: 0 })
    // Banner debajo del hero con texto "Completar →"
    expect(screen.getAllByText(/Completar/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('LeaderHome — ranking premium', () => {
  it('muestra el mini-ranking con las posiciones del top', () => {
    renderLeader()
    expect(screen.getByText(/VOS VAN PRIMERO/i)).toBeInTheDocument()
    expect(screen.getByText('Ver completo →')).toBeInTheDocument()
  })

  it('el usuario propio aparece marcado con "— VOS"', () => {
    renderLeader()
    expect(screen.getByText('— VOS')).toBeInTheDocument()
  })

  it('muestra las medallas para los 3 primeros puestos', () => {
    renderLeader()
    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
  })

  it('sin ranking → no muestra la sección de ranking', () => {
    renderLeader({ ranking: [] })
    expect(screen.queryByText('🥇')).not.toBeInTheDocument()
  })
})

describe('LeaderHome — próximos partidos', () => {
  it('renderiza tarjetas de partidos programados', () => {
    renderLeader()
    expect(screen.getAllByTestId('match-card').length).toBeGreaterThanOrEqual(1)
  })

  it('partidos finalizados no aparecen en "próximos"', () => {
    const matches = [makeMatch('m1', 'finished'), makeMatch('m2', 'finished')]
    renderLeader({ matches })
    expect(screen.queryByTestId('match-card')).not.toBeInTheDocument()
  })

  it('muestra máximo 4 partidos próximos', () => {
    const matches = Array.from({ length: 6 }, (_, i) => makeMatch(`m${i}`))
    renderLeader({ matches })
    expect(screen.getAllByTestId('match-card').length).toBe(4)
  })

  it('sin partidos próximos → no muestra la sección', () => {
    renderLeader({ matches: [] })
    expect(screen.queryByText(/Se viene tu próxima defensa/i)).not.toBeInTheDocument()
  })
})

describe('LeaderHome — compartir', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true, writable: true,
    })
  })

  it('muestra el botón "Compartir que voy primero"', () => {
    renderLeader()
    expect(screen.getAllByRole('button', { name: /Compartir/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('sin navigator.share → click muestra "✓ Link copiado"', async () => {
    const user = userEvent.setup()
    renderLeader()
    const btns = screen.getAllByRole('button', { name: /Compartir/i })
    await user.click(btns[btns.length - 1])
    await waitFor(() => {
      expect(screen.getByText(/✓ Link copiado/i)).toBeInTheDocument()
    })
  })

  it('con navigator.share → llama navigator.share', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })
    const user = userEvent.setup()
    renderLeader()
    const btns = screen.getAllByRole('button', { name: /Compartir/i })
    await user.click(btns[0])
    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('primero') }))
    })
  })
})

describe('LeaderHome — banner emocional', () => {
  it('muestra el texto del banner "Te queremos premiar"', () => {
    renderLeader()
    expect(screen.getByText(/Te queremos premiar/i)).toBeInTheDocument()
  })

  it('muestra el texto exclusivo "exclusiva para vos"', () => {
    renderLeader()
    expect(screen.getByText(/exclusiva para vos/i)).toBeInTheDocument()
  })
})
