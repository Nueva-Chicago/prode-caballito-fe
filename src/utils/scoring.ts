import type { PointColor } from '@/types'

export function calcularPuntaje(
  bet: { goles_local: number; goles_visitante: number },
  result: { resultado_local: number; resultado_visitante: number }
): { puntos: number; bonus: boolean; color: PointColor } {
  const betGlobal = bet.goles_local === bet.goles_visitante ? 'empate' : bet.goles_local > bet.goles_visitante ? 'local' : 'visitante'
  const resGlobal = result.resultado_local === result.resultado_visitante ? 'empate' : result.resultado_local > result.resultado_visitante ? 'local' : 'visitante'
  const acertoGlobal = betGlobal === resGlobal
  const exactoLocal = bet.goles_local === result.resultado_local
  const exactoVisitante = bet.goles_visitante === result.resultado_visitante
  const exactos = (exactoLocal ? 1 : 0) + (exactoVisitante ? 1 : 0)
  const totalGoles = result.resultado_local + result.resultado_visitante

  if (!acertoGlobal) return { puntos: 0, bonus: false, color: 'gris' }

  const bonus = exactos === 2 && totalGoles >= 4
  let puntos = exactos === 0 ? 1 : exactos === 1 ? 2 : 3
  if (bonus) puntos += 1

  const colorMap: Record<number, PointColor> = { 1: 'amarillo', 2: 'verde', 3: 'rojo', 4: 'celeste' }
  return { puntos, bonus, color: colorMap[puntos] ?? 'amarillo' }
}

export const POINT_COLORS: Record<PointColor, string> = {
  celeste:  'bg-sky-400 text-white',
  rojo:     'bg-red-500 text-white',
  verde:    'bg-green-500 text-white',
  amarillo: 'bg-yellow-400 text-white',
  gris:     'bg-gray-200 text-gray-500',
}

export function formatScore(local: number | undefined, visitante: number | undefined): string {
  if (local === undefined || visitante === undefined) return '-'
  return `${local}-${visitante}`
}
