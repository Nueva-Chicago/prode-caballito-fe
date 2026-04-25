import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '@/pages/Register'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: null, setAuth: vi.fn(), updateUser: vi.fn() }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn() },
}))

function renderRegister() {
  return render(<MemoryRouter><Register /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Register — paso 1: formulario', () => {
  afterEach(() => vi.clearAllMocks())

  it('renderiza los campos nombre, email y contraseña', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toBeInTheDocument()
  })

  it('botón de submit dice "Continuar →"', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument()
  })

  it('tiene link a /login para usuarios que ya tienen cuenta', () => {
    renderRegister()
    expect(screen.getByText(/Iniciá sesión/i)).toBeInTheDocument()
  })

  it('submit exitoso → llama API y avanza al paso de verificación', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { pendingId: 'pending123' } },
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Carlos')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register-pending', expect.objectContaining({
        nombre: 'Carlos', email: 'carlos@test.com',
      }))
    })
    // Avanza al paso de verificación
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    })
  })

  it('error en submit → toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'El email ya está registrado' } },
    })

    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Carlos')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('El email ya está registrado', 'error')
    })
  })
})

describe('Register — paso 2: verificación de email', () => {
  afterEach(() => vi.clearAllMocks())

  async function goToVerifyStep() {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { pendingId: 'pending123' } },
    })
    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre'), 'Carlos')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument())
    return { user, api }
  }

  it('muestra input de código de 6 dígitos', async () => {
    await goToVerifyStep()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verificar/i })).toBeInTheDocument()
  })

  it('reenviar código → llama API /auth/resend-code', async () => {
    const { user, api } = await goToVerifyStep()
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

    await user.click(screen.getByText(/Reenviar código/i))
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/resend-code', expect.objectContaining({ pendingId: 'pending123' }))
    })
  })

  it('código correcto → avanza al paso de completar perfil', async () => {
    const { user, api } = await goToVerifyStep()
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { userId: 'u1' } },
    })

    await user.type(screen.getByPlaceholderText('000000'), '123456')
    await user.click(screen.getByRole('button', { name: /Verificar/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', expect.objectContaining({ code: '123456' }))
    })
    // Paso 3: perfil completo
    await waitFor(() => {
      expect(screen.getByText(/Email verificado/i)).toBeInTheDocument()
    })
  })
})
