import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Reglamento } from '@/pages/Reglamento'

function renderReglamento() {
  return render(<MemoryRouter><Reglamento /></MemoryRouter>)
}

describe('Reglamento', () => {
  it('renderiza el título principal', () => {
    renderReglamento()
    expect(screen.getAllByText(/MUNDIAL/i).length).toBeGreaterThan(0)
  })

  it('muestra la sección de sistema de puntuación', () => {
    renderReglamento()
    expect(screen.getByText('Sistema de Puntuación')).toBeInTheDocument()
  })

  it('muestra la sección de ejemplos prácticos', () => {
    renderReglamento()
    expect(screen.getByText('Ejemplos Prácticos')).toBeInTheDocument()
  })

  it('muestra múltiples ejemplos numerados', () => {
    renderReglamento()
    expect(screen.getAllByText(/Ejemplo \d/i).length).toBeGreaterThan(0)
  })
})
