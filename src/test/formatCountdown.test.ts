import { describe, it, expect } from 'vitest'
import { formatCountdown } from '@/hooks/useCountdown'

describe('formatCountdown', () => {
  it('shows seconds only when under 1 minute', () => {
    expect(formatCountdown(0, 0, 45)).toBe('45s')
    expect(formatCountdown(0, 0, 1)).toBe('1s')
  })

  it('shows minutes + seconds when under 1 hour', () => {
    expect(formatCountdown(0, 5, 30)).toBe('5m 30s')
    expect(formatCountdown(0, 59, 9)).toBe('59m 09s')
  })

  it('pads seconds to 2 digits', () => {
    expect(formatCountdown(0, 3, 7)).toBe('3m 07s')
  })

  it('shows hours + minutes when under 48 hours', () => {
    expect(formatCountdown(2, 15, 0)).toBe('2h 15m')
    expect(formatCountdown(47, 59, 59)).toBe('47h 59m')
  })

  it('pads minutes to 2 digits in hour format', () => {
    expect(formatCountdown(3, 5, 0)).toBe('3h 05m')
  })

  it('shows days + hours when 48 hours or more', () => {
    expect(formatCountdown(48, 0, 0)).toBe('2d')
    expect(formatCountdown(49, 3, 0)).toBe('2d 1h')
    expect(formatCountdown(72, 0, 0)).toBe('3d')
    expect(formatCountdown(100, 4, 0)).toBe('4d 4h')
  })

  it('omits remaining hours when zero in days format', () => {
    expect(formatCountdown(96, 30, 0)).toBe('4d')
  })

  it('handles the reported regression: 1311h should show days', () => {
    // 1311h = 54 days 15h
    expect(formatCountdown(1311, 41, 0)).toBe('54d 15h')
  })
})
