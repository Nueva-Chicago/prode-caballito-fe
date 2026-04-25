import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '@/hooks/useCountdown'

describe('useCountdown hook', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('devuelve null cuando targetDate es null', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current).toBeNull()
  })

  it('devuelve null cuando la fecha ya pasó', () => {
    const past = new Date(Date.now() - 5000)
    const { result } = renderHook(() => useCountdown(past))
    expect(result.current).toBeNull()
  })

  it('calcula horas/minutos/segundos correctamente', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const future = new Date(Date.now() + 3 * 3600000 + 5 * 60000 + 30000)
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current).toEqual({ h: 3, m: 5, s: 30 })
  })

  it('actualiza el countdown cada segundo', () => {
    vi.useFakeTimers()
    const future = new Date(Date.now() + 10000)
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current?.s).toBe(10)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current?.s).toBe(9)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current?.s).toBe(8)
  })

  it('devuelve null cuando el tiempo expira', () => {
    vi.useFakeTimers()
    const future = new Date(Date.now() + 2000)
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current).not.toBeNull()
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current).toBeNull()
  })
})
