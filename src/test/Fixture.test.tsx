import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Fixture } from '@/pages/Fixture'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Test', idioma_pref: 'es', rol: 'user' } }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/hooks/useT', () => ({
  useT: () => ({
    fixture: {
      title: 'Fixture Mundial',
      download: 'Descargar',
      share: 'Compartir',
      copied: '¡Copiado!',
      shareText: 'Mirá el fixture',
      subtitle: 'Copa del Mundo 2026',
      worldCup: 'Copa del Mundo',
      path: 'El camino de',
      group: 'Grupo',
      viewPath: 'Ver camino',
      worldCupStart: 'Inicio',
      startDate: '11 Jun',
      finalLabel: 'Final',
      finalDate: '19 Jul',
      venues: 'Sedes',
      venuesValue: '16',
      teams: 'Equipos',
      teamsValue: '48',
      historyTitle: 'Historia',
      historyStars: '⭐⭐⭐',
      historyYears: '1930 · 1978 · 1986',
      viewHistory: 'Ver historia',
      bannerTitle: 'Mundial 2026',
      bannerSubtitle: 'Arrancá tu PRODE',
      modalHistoryTitle: 'Historia Argentina',
      records: [],
    },
  }),
}))

function renderFixture() {
  return render(<MemoryRouter><Fixture /></MemoryRouter>)
}

describe('Fixture', () => {
  it('renderiza sin errores', () => {
    expect(() => renderFixture()).not.toThrow()
  })

  it('muestra los grupos de la fase de grupos', () => {
    renderFixture()
    expect(screen.getByText('Grupo A')).toBeInTheDocument()
  })

  it('muestra botón de descarga', () => {
    renderFixture()
    expect(screen.getByRole('button', { name: /descargar/i })).toBeInTheDocument()
  })

  it('muestra botón de compartir', () => {
    renderFixture()
    expect(screen.getByText(/Compartir/i)).toBeInTheDocument()
  })

  it('muestra equipos en los grupos', () => {
    renderFixture()
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText('Argentina')).toBeInTheDocument()
  })

  it('el botón de descarga crea un elemento <a> y hace click', () => {
    const clickSpy = vi.fn()
    const orig = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: any[]) => {
      const el = orig(tag, ...rest)
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(clickSpy)
      }
      return el
    })
    renderFixture()
    fireEvent.click(screen.getByRole('button', { name: /descargar/i }))
    expect(clickSpy).toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
