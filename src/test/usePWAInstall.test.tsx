import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

function setStandaloneMode(value: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)' ? value : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  setStandaloneMode(false)
  setUserAgent('Mozilla/5.0 (Windows NT 10.0)')
  delete (window as any).MSStream
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePWAInstall', () => {
  it('estado inicial es unavailable', () => {
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.state.type).toBe('unavailable')
  })

  it('detecta modo standalone como installed', () => {
    setStandaloneMode(true)
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.state.type).toBe('installed')
  })

  it('detecta iOS como estado ios', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.state.type).toBe('ios')
  })

  it('pasa a prompt cuando dispara beforeinstallprompt', () => {
    const { result } = renderHook(() => usePWAInstall())
    act(() => {
      const event = new Event('beforeinstallprompt')
      Object.assign(event, {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      })
      window.dispatchEvent(event)
    })
    expect(result.current.state.type).toBe('prompt')
  })

  it('pasa a installed cuando dispara appinstalled', () => {
    const { result } = renderHook(() => usePWAInstall())
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.state.type).toBe('installed')
  })

  it('install no hace nada si no hay deferredPrompt', async () => {
    const { result } = renderHook(() => usePWAInstall())
    await act(async () => {
      await result.current.install()
    })
    expect(result.current.state.type).toBe('unavailable')
  })

  it('install llama a prompt y actualiza estado a installed si accepted', async () => {
    const { result } = renderHook(() => usePWAInstall())
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const })

    act(() => {
      const event = new Event('beforeinstallprompt')
      Object.assign(event, { prompt: mockPrompt, userChoice: mockUserChoice })
      window.dispatchEvent(event)
    })

    await act(async () => {
      await result.current.install()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(result.current.state.type).toBe('installed')
  })
})
