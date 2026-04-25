import { describe, it, expect, beforeEach, vi } from 'vitest'
import { textOnBg, applyTheme } from '@/utils/theme'

describe('textOnBg', () => {
  it('devuelve blanco sobre fondo oscuro', () => {
    expect(textOnBg('#001A4B')).toBe('#FFFFFF')
  })

  it('devuelve oscuro sobre fondo claro', () => {
    expect(textOnBg('#FFFFFF')).toBe('#1A1A1A')
  })

  it('devuelve blanco sobre negro', () => {
    expect(textOnBg('#000000')).toBe('#FFFFFF')
  })

  it('devuelve oscuro sobre amarillo', () => {
    expect(textOnBg('#FFD700')).toBe('#1A1A1A')
  })
})

describe('applyTheme', () => {
  let setAttribute: ReturnType<typeof vi.fn>
  let setProperty: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setAttribute = vi.fn()
    setProperty = vi.fn()
    vi.stubGlobal('document', {
      documentElement: { setAttribute, style: { setProperty } },
    })
  })

  it('aplica tema conocido', () => {
    applyTheme('argentina')
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'argentina')
    expect(setProperty).toHaveBeenCalledWith('--theme-on-primary', expect.any(String))
    expect(setProperty).toHaveBeenCalledWith('--theme-on-secondary', expect.any(String))
  })

  it('cae a neutral para tema desconocido', () => {
    applyTheme('equipo_inventado')
    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'neutral')
  })
})
