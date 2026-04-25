import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Ranking } from '@/pages/Ranking'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
}))

vi.mock('@/components/ui/AdCard', () => ({ AdCard: () => null }))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RANKING = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 30, position: 1,
    exactos_count: 5, aciertos_celeste: 1, aciertos_verde: 2, aciertos_amarillo: 3, precio_pagado: true },
  { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García', puntos_totales: 20, position: 2,
    exactos_count: 3, aciertos_celeste: 0, aciertos_verde: 1, aciertos_amarillo: 2, precio_pagado: true },
  { planilla_id: 'p3', user_id: 'u3', user_name: 'Bob López', puntos_totales: 10, position: 3,
    exactos_count: 1, aciertos_celeste: 0, aciertos_verde: 0, aciertos_amarillo: 1, precio_pagado: false },
]

async function setupApi(overrides: { ranking?: unknown[]; favorites?: string[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('favorites')) return Promise.resolve({ data: { data: overrides.favorites ?? [] } })
    if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? RANKING } } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderRanking() {
  return render(<MemoryRouter><Ranking /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Ranking — renderizado con datos', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('muestra lista de jugadores con puntos', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Bob López')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('mi posición aparece en el hero card', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => {
      // Carlos es u1 → isMe → su nombre aparece en el hero
      expect(screen.getAllByText('Carlos Foo').length).toBeGreaterThan(0)
    }, { timeout: 3000 })
  })

  it('botón Compartir posición visible cuando tengo puntos', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => {
      expect(screen.getByText(/Compartir posición/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('sin puntos → no muestra botón Compartir posición', async () => {
    const ranking = [
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 0, position: 1,
        exactos_count: 0, aciertos_celeste: 0, aciertos_verde: 0, aciertos_amarillo: 0, precio_pagado: true },
    ]
    await setupApi({ ranking })
    renderRanking()
    await waitFor(() => {
      // El ranking cargó (vemos el nombre)
      expect(screen.getAllByText('Carlos Foo').length).toBeGreaterThan(0)
    }, { timeout: 3000 })
    expect(screen.queryByText(/Compartir posición/i)).toBeNull()
  })

  it('click en una fila abre el drawer con el nombre del jugador', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText('Ana García'))
    await waitFor(() => {
      // El drawer muestra el nombre completo
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(1)
    })
  })

  it('jugador impago muestra badge IMPAGA', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => {
      expect(screen.getByText(/IMPAGA/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Ranking — filtro favoritos', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en Favoritos activa el filtro → empty state sin favoritos', async () => {
    const user = userEvent.setup()
    // Ranking sin u1 → al filtrar por favoritos (vacíos) el displayRanking queda vacío
    const rankingSinMi = RANKING.filter(r => r.user_id !== 'u1')
    await setupApi({ ranking: rankingSinMi })
    renderRanking()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /⭐ Favoritos/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /⭐ Favoritos/i }))
    await waitFor(() => {
      expect(screen.getByText(/Tu grupo privado está vacío/i)).toBeInTheDocument()
    })
  })

  it('banner de favoritos se cierra con ×', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => {
      // Banner aparece por defecto (localStorage vacío)
      expect(screen.getByText(/Armá tu grupo privado/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /Cerrar/i }))
    expect(screen.queryByText(/Armá tu grupo privado/i)).toBeNull()
  })
})
