import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

if (!(global as any).Notification) {
  ;(global as any).Notification = { permission: 'default' }
}

function mockPushEnv({
  hasServiceWorker = true,
  hasPushManager = true,
  permission = 'default' as NotificationPermission,
  subscription = null as PushSubscription | null,
} = {}) {
  if (!hasServiceWorker) {
    delete (navigator as any).serviceWorker
  } else {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(subscription),
            subscribe: vi.fn().mockResolvedValue({ endpoint: 'https://push.test', toJSON: () => ({}) }),
          },
        }),
      },
    })
  }

  if (!hasPushManager) {
    delete (window as any).PushManager
  } else {
    (window as any).PushManager = class {}
  }

  Object.defineProperty(Notification, 'permission', {
    configurable: true,
    get: () => permission,
  })
}

vi.mock('@/api/client', () => ({
  api: { post: vi.fn().mockResolvedValue({}), delete: vi.fn().mockResolvedValue({}) },
}))

describe('usePushNotifications', () => {
  beforeEach(() => {
    mockPushEnv()
    vi.resetModules()
  })

  it('estado unsupported cuando no hay serviceWorker', async () => {
    mockPushEnv({ hasServiceWorker: false })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await new Promise(r => setTimeout(r, 10)) })
    expect(result.current.state).toBe('unsupported')
  })

  it('estado unsupported cuando no hay PushManager', async () => {
    mockPushEnv({ hasPushManager: false })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await new Promise(r => setTimeout(r, 10)) })
    expect(result.current.state).toBe('unsupported')
  })

  it('estado denied cuando el permiso es denegado', async () => {
    mockPushEnv({ permission: 'denied' })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await new Promise(r => setTimeout(r, 10)) })
    expect(result.current.state).toBe('denied')
  })

  it('estado subscribed cuando ya hay suscripción', async () => {
    mockPushEnv({ subscription: { endpoint: 'https://push.test', toJSON: () => ({}) } as any })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.state).toBe('subscribed')
  })

  it('estado unsubscribed cuando no hay suscripción', async () => {
    mockPushEnv({ subscription: null })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await new Promise(r => setTimeout(r, 50)) })
    expect(result.current.state).toBe('unsubscribed')
  })
})
