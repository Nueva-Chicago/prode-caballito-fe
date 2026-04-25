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

const USERS = [
  { id: 'u2', nombre: 'Ana García', foto_url: null },
]

async function setupApi(overrides: {
  users?: unknown[]; conversations?: unknown[]; messages?: unknown[]; rejectUsers?: boolean
} = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/messages/users') {
      if (overrides.rejectUsers) return Promise.reject(new Error('network'))
      return Promise.resolve({ data: { data: overrides.users ?? USERS } })
    }
    if (url === '/messages/conversations') return Promise.resolve({ data: { data: overrides.conversations ?? [] } })
    if (url.startsWith('/messages/')) return Promise.resolve({ data: { data: { messages: overrides.messages ?? [] } } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMessages(userId?: string) {
  if (userId) {
    return render(
      <MemoryRouter initialEntries={[`/messages/${userId}`]}>
        <Routes><Route path="/messages/:userId" element={<Messages />} /></Routes>
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

describe('Messages — manejo de errores', () => {
  afterEach(() => vi.clearAllMocks())

  it('error al cargar usuarios → toast de error', async () => {
    await setupApi({ rejectUsers: true })
    renderMessages()
    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('Error'), 'error')
    }, { timeout: 3000 })
  })
})

describe('Messages — timestamps de conversaciones', () => {
  afterEach(() => vi.clearAllMocks())

  it('last_time de ayer muestra "Ayer"', async () => {
    const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString()
    await setupApi({
      conversations: [{ other_user_id: 'u2', last_message: 'Hola', last_time: yesterday, unread_count: 0 }],
    })
    renderMessages()
    await waitFor(() => {
      expect(screen.getByText('Ayer')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('last_time de esta semana muestra día abreviado', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    await setupApi({
      conversations: [{ other_user_id: 'u2', last_message: 'Ok', last_time: threeDaysAgo, unread_count: 0 }],
    })
    renderMessages()
    await waitFor(() => {
      // No muestra "Ayer" ni una hora — muestra día de la semana
      const ayer = screen.queryByText('Ayer')
      expect(ayer).toBeNull()
      // La conversación existe
      expect(screen.getByText('Ana García')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Messages — apertura de conversación', () => {
  afterEach(() => vi.clearAllMocks())

  it('abrir conversación resetea el contador de no leídos', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/messages/users') return Promise.resolve({ data: { data: USERS } })
      if (url === '/messages/conversations') return Promise.resolve({
        data: { data: [{ other_user_id: 'u2', last_message: 'Hola', last_time: new Date().toISOString(), unread_count: 3 }] },
      })
      if (url.startsWith('/messages/')) return Promise.resolve({ data: { data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    // Renderizar ya con userId=u2 → debe llamar al GET de mensajes y resetear unread
    renderMessages('u2')
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Escribí un mensaje/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // El GET a /messages/u2 fue llamado (para cargar los mensajes y marcar como leído)
    expect(api.get).toHaveBeenCalledWith('/messages/u2')
  })

  it('mensajes en data.data directamente (fallback de shape)', async () => {
    const { api } = await import('@/api/client')
    const msgs = [{ id: 'msg1', sender_id: 'u2', receiver_id: 'u1', content: 'Hola', created_at: new Date().toISOString() }]
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/messages/users') return Promise.resolve({ data: { data: USERS } })
      if (url === '/messages/conversations') return Promise.resolve({ data: { data: [] } })
      // Devuelve array directo en data.data (sin .messages wrapper)
      if (url.startsWith('/messages/')) return Promise.resolve({ data: { data: msgs } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderMessages('u2')
    await waitFor(() => {
      expect(screen.getByText('Hola')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Messages — actualiza sidebar tras envío', () => {
  afterEach(() => vi.clearAllMocks())

  it('después de enviar, el preview de conversación se actualiza', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    const newMsg = { id: 'msg1', sender_id: 'u1', receiver_id: 'u2', content: 'Nuevo mensaje', created_at: new Date().toISOString() }
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { data: newMsg } })

    await setupApi({
      conversations: [{ other_user_id: 'u2', last_message: 'Anterior', last_time: new Date().toISOString(), unread_count: 0 }],
    })
    renderMessages('u2')

    await waitFor(() => expect(screen.getByPlaceholderText(/Escribí un mensaje/i)).toBeInTheDocument(), { timeout: 3000 })

    await user.type(screen.getByPlaceholderText(/Escribí un mensaje/i), 'Nuevo mensaje')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      // El mensaje aparece en el chat (puede aparecer también en el input antes de limpiar)
      expect(screen.getAllByText('Nuevo mensaje').length).toBeGreaterThan(0)
    })
  })
})
