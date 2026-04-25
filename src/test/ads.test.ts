import { describe, it, expect, beforeEach } from 'vitest'
import { getSessionAd, ADS } from '@/config/ads'

describe('getSessionAd', () => {
  const KEY = 'prode_ad_session_idx'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('devuelve un ad válido del array ADS', () => {
    const ad = getSessionAd()
    expect(ADS).toContain(ad)
  })

  it('persiste el índice en sessionStorage', () => {
    getSessionAd()
    const stored = sessionStorage.getItem(KEY)
    expect(stored).not.toBeNull()
    const idx = parseInt(stored!, 10)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(ADS.length)
  })

  it('devuelve el mismo ad en llamadas sucesivas', () => {
    const first = getSessionAd()
    const second = getSessionAd()
    expect(first).toBe(second)
  })

  it('usa el índice almacenado si ya existe', () => {
    sessionStorage.setItem(KEY, '0')
    const ad = getSessionAd()
    expect(ad).toBe(ADS[0])
  })

  it('maneja índice guardado con módulo si es out-of-bounds', () => {
    sessionStorage.setItem(KEY, String(ADS.length + 1))
    const ad = getSessionAd()
    expect(ADS).toContain(ad)
  })

  it('cada ad tiene los campos requeridos', () => {
    ADS.forEach(ad => {
      expect(ad.id).toBeTruthy()
      expect(ad.headline).toBeTruthy()
      expect(ad.ctaUrl).toBeTruthy()
      expect(ad.ctaText).toBeTruthy()
    })
  })
})
