import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '@/pages/Login'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockSetAuth = vi.fn()
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ setAuth: mockSetAuth }),
}))

const mockShow = vi.fn()
vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn() },
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza los campos email y contraseña', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('muestra link a registro', () => {
    renderLogin()
    const link = screen.getByRole('link', { name: /registrate/i })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('login exitoso → setAuth + navigate("/")', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        data: {
          user: { id: 'u1', nombre: 'Carlos', rol: 'user' },
          token: 'tok123',
          refreshToken: 'ref456',
        },
      },
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••'), 'pass123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        { id: 'u1', nombre: 'Carlos', rol: 'user' },
        'tok123',
        'ref456'
      )
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('login fallido → muestra toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Credenciales inválidas' } },
    })

    renderLogin()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Credenciales inválidas', 'error')
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('error sin mensaje específico → mensaje genérico', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

    renderLogin()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'bad@test.com')
    await user.type(screen.getByPlaceholderText('••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Error al iniciar sesión', 'error')
    })
  })

  it('botón se deshabilita durante el submit', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    let resolve!: (v: unknown) => void
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((r) => { resolve = r })
    )

    renderLogin()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com')
    await user.type(screen.getByPlaceholderText('••••••'), 'pass')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled()

    // cleanup
    resolve({ data: { data: { user: {}, token: '', refreshToken: '' } } })
  })
})
