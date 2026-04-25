import { describe, it, expect } from 'vitest'
import { formatCountdown } from '@/hooks/useCountdown'

describe('formatCountdown', () => {
  it('formato días+horas cuando h >= 48', () => {
    expect(formatCountdown(72, 30, 0)).toBe('3d')
    expect(formatCountdown(49, 5, 0)).toBe('2d 1h')
    expect(formatCountdown(48, 0, 0)).toBe('2d')
  })

  it('nunca muestra horas como "1311h"', () => {
    const result = formatCountdown(1311, 41, 0)
    expect(result).not.toContain('1311h')
    expect(result).toMatch(/^\d+d/)
  })

  it('formato horas+minutos cuando 0 < h < 48', () => {
    expect(formatCountdown(5, 3, 0)).toBe('5h 03m')
    expect(formatCountdown(1, 0, 45)).toBe('1h 00m')
  })

  it('formato minutos+segundos cuando h=0 y m>0', () => {
    expect(formatCountdown(0, 15, 8)).toBe('15m 08s')
    expect(formatCountdown(0, 1, 0)).toBe('1m 00s')
  })

  it('formato solo segundos cuando h=0 y m=0', () => {
    expect(formatCountdown(0, 0, 45)).toBe('45s')
    expect(formatCountdown(0, 0, 0)).toBe('0s')
  })

  it('padStart en minutos y segundos', () => {
    expect(formatCountdown(2, 5, 0)).toBe('2h 05m')
    expect(formatCountdown(0, 3, 7)).toBe('3m 07s')
  })
})
