import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Profile } from '@/pages/Profile'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: {
        id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user',
        foto_url: null, tema_equipo: 'default',
        whatsapp_number: '', whatsapp_consent: false,
      },
      updateUser: vi.fn(),
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ state: 'unsupported', subscribe: vi.fn(), unsubscribe: vi.fn(), loading: false }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setupApi() {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { data: { whatsapp_number: '', whatsapp_consent: false } },
  })
  ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { data: { nombre: 'Nuevo nombre', whatsapp_number: '', whatsapp_consent: true } },
  })
}

function renderProfile() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Profile — renderizado básico', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra el título de perfil', async () => {
    await setupApi()
    renderProfile()
    expect(screen.getByText('Mi Perfil')).toBeInTheDocument()
  })

  it('muestra el nombre del usuario', async () => {
    await setupApi()
    renderProfile()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
  })

  it('sección Tema Visual está visible', async () => {
    await setupApi()
    renderProfile()
    expect(screen.getByText(/Tema Visual/i)).toBeInTheDocument()
  })

  it('sección WhatsApp está visible', async () => {
    await setupApi()
    renderProfile()
    expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument()
  })
})

describe('Profile — editar nombre', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en ✏️ → muestra input con el nombre actual', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderProfile()

    // El botón de editar nombre es el ✏️ junto al h2
    const editBtns = screen.getAllByRole('button', { name: '✏️' })
    await user.click(editBtns[0])
    const input = screen.getByDisplayValue('Carlos')
    expect(input).toBeInTheDocument()
  })

  it('guardar nombre → llama API y muestra toast', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    await setupApi()
    renderProfile()

    const editBtns = screen.getAllByRole('button', { name: '✏️' })
    await user.click(editBtns[0])
    const input = screen.getByDisplayValue('Carlos')
    await user.clear(input)
    await user.type(input, 'Carlitos')
    // Con editName=true hay dos botones "Guardar": el del nombre (primero) y el de WhatsApp
    const saveButtons = screen.getAllByRole('button', { name: 'Guardar' })
    await user.click(saveButtons[0])

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/users/u1',
        expect.objectContaining({ nombre: 'Carlitos' })
      )
    })
    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('actualizado'), 'success')
    })
  })
})

describe('Profile — WhatsApp', () => {
  afterEach(() => vi.clearAllMocks())

  it('guardar WhatsApp → llama API', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    await setupApi()
    renderProfile()

    // El botón de guardar WhatsApp dice t.profile.save = "Guardar"
    // (push section oculta por mock state='unsupported', editName=false → solo hay un "Guardar")
    const saveBtn = await screen.findByRole('button', { name: 'Guardar' })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/u1', expect.objectContaining({ whatsapp_consent: expect.any(Boolean) }))
    })
  })
})
