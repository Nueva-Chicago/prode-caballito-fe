import { describe, it, expect } from 'vitest'
import { teamFlag, teamAbbr } from '@/utils/teamFlags'

describe('teamFlag', () => {
  it('devuelve emoji para equipo conocido (exacto)', () => {
    expect(teamFlag('Argentina')).toBe('🇦🇷')
  })

  it('es case-insensitive', () => {
    expect(teamFlag('argentina')).toBe('🇦🇷')
    expect(teamFlag('ARGENTINA')).toBe('🇦🇷')
    expect(teamFlag('ArGeNtInA')).toBe('🇦🇷')
  })

  it('ignora espacios al inicio y al final', () => {
    expect(teamFlag('  Brasil  ')).toBe('🇧🇷')
  })

  it('maneja nombres en español e inglés del mismo país', () => {
    expect(teamFlag('Francia')).toBe('🇫🇷')
    expect(teamFlag('France')).toBe('🇫🇷')
  })

  it('maneja nombres con tilde y sin tilde', () => {
    expect(teamFlag('Perú')).toBe('🇵🇪')
    expect(teamFlag('Peru')).toBe('🇵🇪')
  })

  it('devuelve string vacío para equipo desconocido', () => {
    expect(teamFlag('Equipo Inventado')).toBe('')
    expect(teamFlag('')).toBe('')
  })

  it('devuelve emoji correcto para países de CONCACAF', () => {
    expect(teamFlag('USA')).toBe('🇺🇸')
    expect(teamFlag('Estados Unidos')).toBe('🇺🇸')
    expect(teamFlag('Mexico')).toBe('🇲🇽')
    expect(teamFlag('México')).toBe('🇲🇽')
  })

  it('devuelve emoji correcto para países africanos y asiáticos', () => {
    expect(teamFlag('Marruecos')).toBe('🇲🇦')
    expect(teamFlag('Morocco')).toBe('🇲🇦')
    expect(teamFlag('Japan')).toBe('🇯🇵')
    expect(teamFlag('Japón')).toBe('🇯🇵')
  })
})

describe('teamAbbr', () => {
  it('devuelve abreviación FIFA para equipo conocido', () => {
    expect(teamAbbr('Argentina')).toBe('ARG')
    expect(teamAbbr('Brasil')).toBe('BRA')
    expect(teamAbbr('France')).toBe('FRA')
    expect(teamAbbr('Spain')).toBe('ESP')
  })

  it('es case-insensitive', () => {
    expect(teamAbbr('argentina')).toBe('ARG')
    expect(teamAbbr('BRASIL')).toBe('BRA')
  })

  it('ignora espacios al inicio y al final', () => {
    expect(teamAbbr('  Uruguay  ')).toBe('URU')
  })

  it('para equipo desconocido devuelve primeras 3 letras en mayúsculas', () => {
    expect(teamAbbr('Inventado')).toBe('INV')
    expect(teamAbbr('xy')).toBe('XY')
  })

  it('maneja alias en español e inglés', () => {
    expect(teamAbbr('Alemania')).toBe('GER')
    expect(teamAbbr('Germany')).toBe('GER')
    expect(teamAbbr('Países Bajos')).toBe('NED')
    expect(teamAbbr('Netherlands')).toBe('NED')
  })

  it('maneja países de CONCACAF y otras zonas', () => {
    expect(teamAbbr('USA')).toBe('USA')
    expect(teamAbbr('Canada')).toBe('CAN')
    expect(teamAbbr('South Korea')).toBe('KOR')
    expect(teamAbbr('Morocco')).toBe('MAR')
  })
})
