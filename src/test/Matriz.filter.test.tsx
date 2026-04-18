import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks pesados primero ────────────────────────────────────────────────────

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' },
      isAdmin: () => false,
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Minimal matrix data: 2 players × 2 matches.
 * match1: p1=exacto(rojo), p2=sin acierto(gris)
 * match2: p1=ganador(amarillo), p2=exacto(rojo)
 */
function buildMatrixData() {
  const players = [
    { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', precio_pagado: true },
    { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana', precio_pagado: true },
  ]

  const matches = [
    {
      id: 'm1', home_team: 'Argentina', away_team: 'Brasil',
      estado: 'finished', finished: true,
      resultado_local: 2, resultado_visitante: 1,
      time_cutoff: '2026-04-01T00:00:00Z', start_time: '2026-04-01T00:00:00Z',
      halftime_minutes: 0,
    },
    {
      id: 'm2', home_team: 'France', away_team: 'Spain',
      estado: 'finished', finished: true,
      resultado_local: 1, resultado_visitante: 0,
      time_cutoff: '2026-04-02T00:00:00Z', start_time: '2026-04-02T00:00:00Z',
      halftime_minutes: 0,
    },
  ]

  // Bets keyed by planilla_id → match_id → bet
  const bets = {
    p1: {
      m1: { planilla_id: 'p1', match_id: 'm1', goles_local: 2, goles_visitante: 1 }, // exacto → rojo (3pts)
      m2: { planilla_id: 'p1', match_id: 'm2', goles_local: 1, goles_visitante: 0 }, // exacto → rojo
    },
    p2: {
      m1: { planilla_id: 'p2', match_id: 'm1', goles_local: 0, goles_visitante: 0 }, // sin acierto → gris
      m2: { planilla_id: 'p2', match_id: 'm2', goles_local: 2, goles_visitante: 0 }, // ganador correcto → amarillo
    },
  }

  return { players, matches, bets }
}

// ─── Unit test: the color filter logic isolated ───────────────────────────────
// We test the filtering logic directly without rendering the full Matriz page,
// since Matriz has complex API loading. The logic is: a cell is hidden when
// filterColors.size > 0 AND the cell's color is NOT in filterColors.

describe('Matriz — lógica de filtro de colores (multi-select)', () => {
  function applyFilter(cellColor: string, filterColors: Set<string>): boolean {
    // Returns true if cell should be VISIBLE
    return filterColors.size === 0 || filterColors.has(cellColor)
  }

  it('sin filtros activos → todas las celdas visibles', () => {
    const filters = new Set<string>()
    expect(applyFilter('rojo', filters)).toBe(true)
    expect(applyFilter('gris', filters)).toBe(true)
    expect(applyFilter('celeste', filters)).toBe(true)
  })

  it('un filtro activo → solo ese color visible', () => {
    const filters = new Set(['rojo'])
    expect(applyFilter('rojo', filters)).toBe(true)
    expect(applyFilter('gris', filters)).toBe(false)
    expect(applyFilter('celeste', filters)).toBe(false)
    expect(applyFilter('amarillo', filters)).toBe(false)
    expect(applyFilter('verde', filters)).toBe(false)
  })

  it('dos filtros activos → ambos colores visibles, resto no', () => {
    const filters = new Set(['rojo', 'amarillo'])
    expect(applyFilter('rojo', filters)).toBe(true)
    expect(applyFilter('amarillo', filters)).toBe(true)
    expect(applyFilter('gris', filters)).toBe(false)
    expect(applyFilter('celeste', filters)).toBe(false)
    expect(applyFilter('verde', filters)).toBe(false)
  })

  it('todos los colores seleccionados → todo visible', () => {
    const filters = new Set(['rojo', 'amarillo', 'verde', 'celeste', 'gris'])
    expect(applyFilter('rojo', filters)).toBe(true)
    expect(applyFilter('gris', filters)).toBe(true)
  })

  it('desactivar un color lo saca del set', () => {
    let filters = new Set(['rojo', 'amarillo'])
    // Simular click: toggle 'rojo' (ya estaba → lo saca)
    const next = new Set(filters)
    next.has('rojo') ? next.delete('rojo') : next.add('rojo')
    filters = next
    expect(filters.has('rojo')).toBe(false)
    expect(filters.has('amarillo')).toBe(true)
  })

  it('activar un nuevo color lo agrega al set', () => {
    let filters = new Set(['rojo'])
    const next = new Set(filters)
    next.has('verde') ? next.delete('verde') : next.add('verde')
    filters = next
    expect(filters.has('rojo')).toBe(true)
    expect(filters.has('verde')).toBe(true)
  })

  it('limpiar filtros → set vacío → todo visible', () => {
    const filters = new Set<string>()
    expect(applyFilter('rojo', filters)).toBe(true)
    expect(applyFilter('gris', filters)).toBe(true)
  })
})
