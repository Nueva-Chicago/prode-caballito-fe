import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  it('no renderiza nada cuando open=false', () => {
    render(<Modal open={false} onClose={vi.fn()}>contenido</Modal>)
    expect(screen.queryByText('contenido')).toBeNull()
  })

  it('renderiza el contenido cuando open=true', () => {
    render(<Modal open={true} onClose={vi.fn()}>contenido</Modal>)
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('muestra el título cuando se provee', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Mi título">x</Modal>)
    expect(screen.getByText('Mi título')).toBeInTheDocument()
  })

  it('no muestra header cuando no hay título', () => {
    render(<Modal open={true} onClose={vi.fn()}>x</Modal>)
    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('llama onClose al hacer click en el backdrop', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose}>x</Modal>)
    const backdrop = document.querySelector('.absolute.inset-0')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('llama onClose al hacer click en el botón ×', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="T">x</Modal>)
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('bloquea el scroll del body cuando open=true', () => {
    render(<Modal open={true} onClose={vi.fn()}>x</Modal>)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restaura el scroll del body cuando open=false', () => {
    const { rerender } = render(<Modal open={true} onClose={vi.fn()}>x</Modal>)
    rerender(<Modal open={false} onClose={vi.fn()}>x</Modal>)
    expect(document.body.style.overflow).toBe('')
  })
})
