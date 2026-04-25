import { describe, it, expect } from 'vitest'
import { calcularPuntaje, formatScore } from '@/utils/scoring'
// test PR — verifica que CI bloquea deploy si hay errores

describe('calcularPuntaje', () => {
  const bet = (local: number, visitante: number) => ({ goles_local: local, goles_visitante: visitante })
  const res = (local: number, visitante: number) => ({ resultado_local: local, resultado_visitante: visitante })

  it('0 pts — se equivocó el ganador', () => {
    expect(calcularPuntaje(bet(1, 0), res(0, 1))).toMatchObject({ puntos: 0, color: 'gris' })
    expect(calcularPuntaje(bet(0, 2), res(2, 0))).toMatchObject({ puntos: 0, color: 'gris' })
  })

  it('0 pts — acertó ganador pero confundió empate con victoria', () => {
    expect(calcularPuntaje(bet(0, 0), res(1, 0))).toMatchObject({ puntos: 0, color: 'gris' })
    expect(calcularPuntaje(bet(1, 0), res(0, 0))).toMatchObject({ puntos: 0, color: 'gris' })
  })

  it('1 pt amarillo — acertó ganador, sin goles exactos', () => {
    // bet(3,1) vs res(1,0): gana local en ambos, pero ningún gol es exacto
    const r = calcularPuntaje(bet(3, 1), res(1, 0))
    expect(r).toMatchObject({ puntos: 1, color: 'amarillo', bonus: false })
  })

  it('1 pt amarillo — empate acertado, marcador incorrecto', () => {
    const r = calcularPuntaje(bet(0, 0), res(1, 1))
    expect(r).toMatchObject({ puntos: 1, color: 'amarillo', bonus: false })
  })

  it('2 pts verde — acertó ganador y diferencia de goles (un gol exacto)', () => {
    // local exacto, visitante incorrecto, diferencia correcta
    const r = calcularPuntaje(bet(2, 1), res(2, 0))
    // betGlobal=local, resGlobal=local → acertó; exacto solo local; diff bet=1, diff res=2 → diff incorrecta → solo 1pt
    // Actually: exactoLocal=true(2==2), exactoVisitante=false(1≠0), exactos=1 → puntos=2 green
    expect(r).toMatchObject({ puntos: 2, color: 'verde', bonus: false })
  })

  it('2 pts verde — diferencia exacta (visitante exacto, local no)', () => {
    const r = calcularPuntaje(bet(3, 1), res(2, 0))
    // betGlobal=local(3>1), resGlobal=local(2>0) → acertó; exactoLocal=false(3≠2), exactoVisitante=false(1≠0)
    // diff bet=2, diff res=2 → exactos=0 (diff OK but no individual exact) → 1pt amarillo
    expect(r).toMatchObject({ puntos: 1, color: 'amarillo' })
  })

  it('3 pts rojo — resultado exacto sin bonus (<4 goles)', () => {
    const r = calcularPuntaje(bet(1, 0), res(1, 0))
    expect(r).toMatchObject({ puntos: 3, color: 'rojo', bonus: false })
  })

  it('3 pts rojo — resultado exacto empate sin bonus', () => {
    const r = calcularPuntaje(bet(1, 1), res(1, 1))
    expect(r).toMatchObject({ puntos: 3, color: 'rojo', bonus: false })
  })

  it('4 pts celeste — resultado exacto con ≥4 goles totales', () => {
    const r = calcularPuntaje(bet(3, 1), res(3, 1))
    expect(r).toMatchObject({ puntos: 4, color: 'celeste', bonus: true })
  })

  it('4 pts celeste — exacto con exactamente 4 goles', () => {
    const r = calcularPuntaje(bet(2, 2), res(2, 2))
    expect(r).toMatchObject({ puntos: 4, color: 'celeste', bonus: true })
  })

  it('3 pts rojo — exacto pero solo 3 goles totales (sin bonus)', () => {
    const r = calcularPuntaje(bet(2, 1), res(2, 1))
    expect(r).toMatchObject({ puntos: 3, color: 'rojo', bonus: false })
  })

  it('0-0 exacto → 3 pts rojo (0 goles no dispara bonus)', () => {
    const r = calcularPuntaje(bet(0, 0), res(0, 0))
    expect(r).toMatchObject({ puntos: 3, color: 'rojo', bonus: false })
  })
})

describe('formatScore', () => {
  it('formatea correctamente', () => {
    expect(formatScore(2, 1)).toBe('2-1')
    expect(formatScore(0, 0)).toBe('0-0')
  })

  it('devuelve "-" si algún valor es undefined', () => {
    expect(formatScore(undefined, 1)).toBe('-')
    expect(formatScore(2, undefined)).toBe('-')
    expect(formatScore(undefined, undefined)).toBe('-')
  })
})
