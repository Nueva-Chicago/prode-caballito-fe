import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

const RANKING = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', puntos_totales: 30, position: 1,
    exactos_count: 5, aciertos_celeste: 1, aciertos_verde: 2, aciertos_amarillo: 3, precio_pagado: true,
    nombre_planilla: 'Mi planilla' },
  { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García', puntos_totales: 20, position: 2,
    exactos_count: 3, aciertos_celeste: 0, aciertos_verde: 1, aciertos_amarillo: 2, precio_pagado: true,
    nombre_planilla: 'Planilla de Ana' },
]

async function setupApi(favorites: string[] = []) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('favorites')) return Promise.resolve({ data: { data: favorites } })
    if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderRanking() {
  return render(<MemoryRouter><Ranking /></MemoryRouter>)
}

describe('Ranking — drawer de jugador', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('drawer muestra estadísticas del jugador', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByText('Ana García'))

    await waitFor(() => {
      // El drawer tiene el nombre completo duplicado (fila + drawer)
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(1)
      // "Planilla de Ana" aparece en fila y en drawer
      expect(screen.getAllByText('Planilla de Ana').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('drawer tiene link a planilla del jugador', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByText('Ana García'))

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /planilla/i })
      expect(link).toHaveAttribute('href', '/planilla/p2')
    })
  })

  it('cerrar backdrop cierra el drawer', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByText('Ana García'))

    await waitFor(() => {
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(1)
    })

    // Click en el backdrop (primer div fixed con bg-black/40)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/40')
    if (backdrop) fireEvent.click(backdrop)

    await waitFor(() => {
      expect(screen.queryAllByText('Ana García').length).toBe(1)
    })
  })
})

describe('Ranking — favoritos toggle', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en estrella agrega favorito → POST a /ranking/favorites', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: {} } })
    await setupApi([])
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })

    // El botón de favorito de Ana tiene title "Agregar a mi grupo"
    const addBtn = screen.getByTitle('Agregar a mi grupo')
    await user.click(addBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ranking/favorites/p2', expect.anything())
    })
  })

  it('click en estrella llena también usa POST (el backend decide acción)', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { action: 'removed' } })
    await setupApi(['p2'])
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })

    // Con p2 en favoritos, el botón dice "Quitar de mi grupo"
    const removeBtn = screen.getByTitle('Quitar de mi grupo')
    await user.click(removeBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ranking/favorites/p2', expect.anything())
    })
  })
})
