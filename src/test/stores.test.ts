import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── toastStore ───────────────────────────────────────────────────────────────

describe('toastStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('show agrega un toast y lo remueve después de 3500ms', async () => {
    const { useToastStore } = await import('@/store/toastStore')
    const store = useToastStore.getState()
    store.show('Hola', 'success')

    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Hola')
    expect(useToastStore.getState().toasts[0].type).toBe('success')

    vi.advanceTimersByTime(3500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('show usa tipo info por defecto', async () => {
    const { useToastStore } = await import('@/store/toastStore')
    useToastStore.getState().show('Test')
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })

  it('remove elimina el toast por id', async () => {
    const { useToastStore } = await import('@/store/toastStore')
    useToastStore.getState().show('A')
    useToastStore.getState().show('B')
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().remove(id)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('B')
  })
})

// ─── authStore ────────────────────────────────────────────────────────────────

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

describe('authStore', () => {
  const fakeUser = { id: 'u1', nombre: 'Test', rol: 'user' as const, tema_equipo: 'neutral', idioma_pref: 'es' as const }

  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('setAuth persiste en localStorage y actualiza el estado', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().setAuth(fakeUser as any, 'tok123', 'ref456')
    expect(localStorage.getItem('token')).toBe('tok123')
    expect(useAuthStore.getState().user?.nombre).toBe('Test')
    expect(useAuthStore.getState().token).toBe('tok123')
  })

  it('logout limpia localStorage y el estado', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().setAuth(fakeUser as any, 'tok123', 'ref456')
    useAuthStore.getState().logout()
    expect(localStorage.getItem('token')).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('isAdmin devuelve false para rol user', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().setAuth(fakeUser as any, 'tok', 'ref')
    expect(useAuthStore.getState().isAdmin()).toBe(false)
  })

  it('isAdmin devuelve true para rol admin', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().setAuth({ ...fakeUser, rol: 'admin' } as any, 'tok', 'ref')
    expect(useAuthStore.getState().isAdmin()).toBe(true)
  })

  it('updateUser modifica campos del usuario', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    useAuthStore.getState().setAuth(fakeUser as any, 'tok', 'ref')
    useAuthStore.getState().updateUser({ nombre: 'Nuevo' })
    expect(useAuthStore.getState().user?.nombre).toBe('Nuevo')
  })
})

// ─── teamBadgesStore ──────────────────────────────────────────────────────────

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

describe('teamBadgesStore', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('load normaliza nombres a mayúsculas', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { 'argentina': 'url-arg', 'Brasil ': 'url-bra' } },
    })
    const { useTeamBadgesStore } = await import('@/store/teamBadgesStore')
    await useTeamBadgesStore.getState().load()
    const badges = useTeamBadgesStore.getState().badges
    expect(badges['ARGENTINA']).toBe('url-arg')
    expect(badges['BRASIL']).toBe('url-bra')
  })

  it('load no vuelve a cargar si ya loaded=true', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: {} } })
    const { useTeamBadgesStore } = await import('@/store/teamBadgesStore')
    await useTeamBadgesStore.getState().load()
    vi.clearAllMocks()
    await useTeamBadgesStore.getState().load()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('setBadge agrega escudo normalizado', async () => {
    const { useTeamBadgesStore } = await import('@/store/teamBadgesStore')
    useTeamBadgesStore.getState().setBadge('uruguay', 'url-uru')
    expect(useTeamBadgesStore.getState().badges['URUGUAY']).toBe('url-uru')
  })

  it('removeBadge elimina el escudo', async () => {
    const { useTeamBadgesStore } = await import('@/store/teamBadgesStore')
    useTeamBadgesStore.getState().setBadge('chile', 'url-chi')
    useTeamBadgesStore.getState().removeBadge('chile')
    expect(useTeamBadgesStore.getState().badges['CHILE']).toBeUndefined()
  })
})

// ─── getTeamBadge ─────────────────────────────────────────────────────────────

describe('getTeamBadge', () => {
  it('devuelve url si existe', async () => {
    const { getTeamBadge } = await import('@/store/teamBadgesStore')
    expect(getTeamBadge('argentina', { ARGENTINA: 'url-arg' })).toBe('url-arg')
  })

  it('devuelve null si no existe', async () => {
    const { getTeamBadge } = await import('@/store/teamBadgesStore')
    expect(getTeamBadge('peru', {})).toBeNull()
  })

  it('normaliza el nombre antes de buscar', async () => {
    const { getTeamBadge } = await import('@/store/teamBadgesStore')
    expect(getTeamBadge(' Brasil ', { BRASIL: 'url-bra' })).toBe('url-bra')
  })
})
