import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Messages } from '@/pages/Messages'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USERS = [
  { id: 'u2', nombre: 'Ana García', foto_url: null },
  { id: 'u3', nombre: 'Bob López', foto_url: null },
]

const CONVERSATIONS = [
  { other_user_id: 'u2', last_message: 'Hola!', last_time: new Date().toISOString(), unread_count: 2 },
]

async function setupApi(overrides: {
  users?: unknown[]; conversations?: unknown[]; messages?: unknown[]
} = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/messages/users') return Promise.resolve({ data: { data: overrides.users ?? USERS } })
    if (url === '/messages/conversations') return Promise.resolve({ data: { data: overrides.conversations ?? CONVERSATIONS } })
    if (url.startsWith('/messages/')) return Promise.resolve({ data: { data: { messages: overrides.messages ?? [] } } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMessages(userId?: string) {
  if (userId) {
    return render(
      <MemoryRouter initialEntries={[`/messages/${userId}`]}>
        <Routes>
          <Route path="/messages/:userId" element={<Messages />} />
        </Routes>
      </MemoryRouter>
    )
  }
  return render(
    <MemoryRouter initialEntries={['/messages']}>
      <Routes>
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:userId" element={<Messages />} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Messages — lista de conversaciones', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra los usuarios disponibles para chatear', async () => {
    await setupApi()
    renderMessages()
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Bob López')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra badge de no leídos en conversación activa', async () => {
    await setupApi()
    renderMessages()
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('sin usuarios → empty state', async () => {
    await setupApi({ users: [], conversations: [] })
    renderMessages()
    await waitFor(() => {
      expect(screen.getByText(/No hay conversaciones/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Messages — conversación activa', () => {
  afterEach(() => vi.clearAllMocks())

  it('con userId en URL muestra input de texto', async () => {
    await setupApi()
    renderMessages('u2')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Escribí un mensaje/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('enviar mensaje → llama API post', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    const newMsg = { id: 'msg1', sender_id: 'u1', receiver_id: 'u2', content: 'Hola Ana', created_at: new Date().toISOString() }
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: newMsg } })

    await setupApi()
    renderMessages('u2')

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Escribí un mensaje/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    const input = screen.getByPlaceholderText(/Escribí un mensaje/i)
    await user.type(input, 'Hola Ana')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/messages/u2', { content: 'Hola Ana' })
    })
  })

  it('error al enviar → toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    await setupApi()
    renderMessages('u2')

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Escribí un mensaje/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    await user.type(screen.getByPlaceholderText(/Escribí un mensaje/i), 'prueba')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('Error'), 'error')
    })
  })
})
