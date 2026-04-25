import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastContainer } from '@/components/ui/Toast'
import { useToastStore } from '@/store/toastStore'

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('ToastContainer', () => {
  it('no renderiza nada sin toasts', () => {
    render(<ToastContainer />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('muestra el mensaje del toast', () => {
    act(() => useToastStore.getState().show('Guardado', 'success'))
    render(<ToastContainer />)
    expect(screen.getByText('Guardado')).toBeInTheDocument()
  })

  it('muestra el ícono correcto según tipo', () => {
    act(() => useToastStore.getState().show('Error!', 'error'))
    render(<ToastContainer />)
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('muestra ícono warning', () => {
    act(() => useToastStore.getState().show('Cuidado', 'warning'))
    render(<ToastContainer />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('muestra ícono info', () => {
    act(() => useToastStore.getState().show('Info', 'info'))
    render(<ToastContainer />)
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })

  it('elimina el toast al hacer click en ×', () => {
    act(() => useToastStore.getState().show('A borrar'))
    render(<ToastContainer />)
    fireEvent.click(screen.getByRole('button'))
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('renderiza múltiples toasts', () => {
    act(() => {
      useToastStore.getState().show('Uno', 'success')
      useToastStore.getState().show('Dos', 'error')
    })
    render(<ToastContainer />)
    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.getByText('Dos')).toBeInTheDocument()
  })
})
