import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useT } from '@/hooks/useT'

// Controlamos el idioma a través del mock de authStore
const mockLang = { value: 'es' as string | undefined }

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: any) => any) => selector({ user: { idioma_pref: mockLang.value } }),
}))

describe('useT — selección de idioma', () => {
  it('devuelve traducciones en español por defecto', () => {
    mockLang.value = 'es'
    const { result } = renderHook(() => useT())
    expect(result.current.nav.home).toBe('Inicio')
  })

  it('devuelve traducciones en español si idioma_pref es undefined', () => {
    mockLang.value = undefined
    const { result } = renderHook(() => useT())
    expect(result.current.nav.home).toBe('Inicio')
  })

  it('devuelve traducciones en portugués cuando idioma_pref es "pt"', () => {
    mockLang.value = 'pt'
    const { result } = renderHook(() => useT())
    // La key nav.home en pt debe ser diferente a la de es
    expect(result.current.nav.home).not.toBe('Inicio')
    expect(typeof result.current.nav.home).toBe('string')
  })

  it('el objeto de traducción tiene las secciones principales', () => {
    mockLang.value = 'es'
    const { result } = renderHook(() => useT())
    expect(result.current).toHaveProperty('nav')
    expect(result.current).toHaveProperty('home')
    expect(result.current).toHaveProperty('bets')
    expect(result.current).toHaveProperty('ranking')
    expect(result.current).toHaveProperty('profile')
    expect(result.current).toHaveProperty('messages')
  })
})
