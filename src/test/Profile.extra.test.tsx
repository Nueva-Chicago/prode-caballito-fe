import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Profile } from '@/pages/Profile'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: {
        id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user',
        foto_url: null, tema_equipo: 'neutral',
        whatsapp_number: '', whatsapp_consent: false,
      },
      updateUser: vi.fn(),
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
}))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ state: 'unsupported', subscribe: vi.fn(), unsubscribe: vi.fn(), loading: false }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { whatsapp_number: '', whatsapp_consent: false } } }),
    put: vi.fn().mockResolvedValue({ data: { data: { nombre: 'Carlos', whatsapp_number: '', whatsapp_consent: false } } }),
  },
}))

function renderProfile() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

describe('Profile — tema visual', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra botones de tema con nombres de equipos', async () => {
    renderProfile()
    // La sección Tema Visual tiene múltiples botones de equipo
    await waitFor(() => {
      expect(screen.getByText(/Tema Visual/i)).toBeInTheDocument()
    })
    // Hay botones de equipos (Argentina, etc.)
    const themeButtons = screen.getAllByRole('button').filter(b =>
      b.className.includes('rounded-xl') && b.className.includes('overflow-hidden')
    )
    expect(themeButtons.length).toBeGreaterThan(0)
  })

  it('click en un tema llama a la API', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    renderProfile()

    await waitFor(() => {
      expect(screen.getByText(/Tema Visual/i)).toBeInTheDocument()
    })

    // Los botones de tema tienen la clase characterística del diseño
    const themeButtons = document.querySelectorAll('button.rounded-xl.overflow-hidden')
    if (themeButtons.length > 0) {
      await user.click(themeButtons[0] as HTMLElement)
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/users/u1', expect.objectContaining({ tema_equipo: expect.any(String) }))
      })
    }
  })
})

describe('Profile — WhatsApp número', () => {
  afterEach(() => vi.clearAllMocks())

  it('el campo tel acepta solo dígitos', async () => {
    const user = userEvent.setup()
    renderProfile()

    const telInput = await screen.findByPlaceholderText(/código de país/i)
    await user.type(telInput, '11 2345-6789')
    // Solo dígitos pasan (el onChange hace replace(/\D/g, ''))
    expect((telInput as HTMLInputElement).value).toMatch(/^\d*$/)
  })

  it('checkbox de consentimiento es clickeable', async () => {
    const user = userEvent.setup()
    renderProfile()

    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('el select de país tiene opciones', async () => {
    renderProfile()
    const select = await screen.findByRole('combobox')
    const options = Array.from(select.querySelectorAll('option'))
    expect(options.length).toBeGreaterThan(0)
  })

  it('cancelar edición de nombre restaura el campo', async () => {
    const user = userEvent.setup()
    renderProfile()

    const editBtns = await screen.findAllByRole('button', { name: '✏️' })
    await user.click(editBtns[0])
    const input = screen.getByDisplayValue('Carlos')
    await user.clear(input)
    await user.type(input, 'Otro')

    // Botón cancelar (×)
    const cancelBtn = screen.getByRole('button', { name: '×' })
    await user.click(cancelBtn)
    expect(screen.queryByDisplayValue('Otro')).toBeNull()
  })
})
