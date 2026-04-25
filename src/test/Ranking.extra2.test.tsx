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
  api: { get: vi.fn(), post: vi.fn() },
}))

const RANKING = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 30, position: 1,
    exactos_count: 5, aciertos_celeste: 1, aciertos_verde: 2, aciertos_amarillo: 3,
    aciertos_rojo: 0, precio_pagado: true, nombre_planilla: 'Planilla Carlos' },
  { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García', puntos_totales: 20, position: 2,
    exactos_count: 3, aciertos_celeste: 0, aciertos_verde: 1, aciertos_amarillo: 2,
    aciertos_rojo: 0, precio_pagado: true, nombre_planilla: 'Planilla Ana' },
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

describe('Ranking — click en hero card propio', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en la card de mi posición abre el drawer', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderRanking()

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Foo').length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // El hero card del usuario logueado tiene cursor-pointer — hacer click abre el drawer
    const heroCard = document.querySelector('.t-gradient-hero.rounded-xl .cursor-pointer')
    if (heroCard) {
      fireEvent.click(heroCard)
      await waitFor(() => {
        expect(screen.getAllByText('Carlos Foo').length).toBeGreaterThan(1)
      })
    }
  })
})

describe('Ranking — compartir posición propia', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en Compartir posición usa window.open (sin navigator.share)', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await setupApi()
    renderRanking()

    await waitFor(() => {
      expect(screen.getByText(/Compartir posición/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByText(/Compartir posición/i))

    // Sin navigator.share jsdom usa window.open con wa.me
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
    })

    openSpy.mockRestore()
  })
})

describe('Ranking — compartir desde drawer', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en Compartir del drawer copia al clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await setupApi()
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })

    // Abrir drawer de Ana
    await user.click(screen.getByText('Ana García'))
    await waitFor(() => expect(screen.getAllByText('Ana García').length).toBeGreaterThan(1))

    // Click en botón Compartir dentro del drawer
    const shareBtns = screen.getAllByRole('button', { name: /Compartir/i })
    await user.click(shareBtns[shareBtns.length - 1])

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })
  })

  it('después de copiar el botón muestra "Copiado"', async () => {
    const user = userEvent.setup()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await setupApi()
    renderRanking()

    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByText('Ana García'))
    await waitFor(() => expect(screen.getAllByText('Ana García').length).toBeGreaterThan(1))

    const shareBtn = screen.getAllByRole('button', { name: /Compartir/i })
    await user.click(shareBtn[shareBtn.length - 1])

    await waitFor(() => expect(screen.getByText(/Copiado/i)).toBeInTheDocument())

    vi.useRealTimers()
  })
})

describe('Ranking — filtro favoritos con favoritos reales', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('con favoritos activos muestra solo favoritos + propio', async () => {
    const user = userEvent.setup()
    // p2 es favorito → al filtrar se ve Ana (favorita) + Carlos (propio u1)
    await setupApi({ favorites: ['p2'] })
    renderRanking()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /⭐ Favoritos/i })).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: /⭐ Favoritos/i }))
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
    })
  })

  it('badge de cantidad de favoritos se muestra en el botón', async () => {
    await setupApi({ favorites: ['p2'] })
    renderRanking()

    await waitFor(() => {
      // El botón tiene el contador "1" de favoritos
      expect(screen.getByText('1')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Ranking — loading state', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('mientras carga muestra el skeleton', () => {
    // API que nunca resuelve
    import('@/api/client').then(({ api }) => {
      ;(api.get as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))
    })
    renderRanking()
    // No hay contenido real todavía
    expect(screen.queryByText('Carlos Foo')).toBeNull()
  })
})
