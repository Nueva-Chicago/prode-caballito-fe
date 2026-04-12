import { POINT_COLORS } from '@/utils/scoring'

const examples = [
  { bet: '2-1', result: '2-1', label: 'Resultado Exacto', pts: 3, bonus: false, color: 'rojo' as const },
  { bet: '2-0', result: '2-1', label: 'Acertó ganador y local', pts: 2, bonus: false, color: 'verde' as const },
  { bet: '3-0', result: '2-1', label: 'Solo acertó ganador', pts: 1, bonus: false, color: 'amarillo' as const },
  { bet: '2-1', result: '1-2', label: 'No acertó ganador', pts: 0, bonus: false, color: 'gris' as const },
  { bet: '3-2', result: '3-2', label: 'Exacto con 5 goles (bonus)', pts: 4, bonus: true, color: 'celeste' as const },
]

export function Reglamento() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-[#001A4B]">📖 Reglamento del PRODE</h1>

      {/* Sistema de puntaje */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-[#001A4B] text-base">Sistema de Puntuación</h2>
        <div className="space-y-2">
          {[
            { color: 'celeste' as const, pts: '4 pts', desc: 'Resultado exacto + ambos goles exactos + 4 o más goles totales (BONUS)' },
            { color: 'rojo' as const,    pts: '3 pts', desc: 'Resultado exacto (ganador + ambos scores)' },
            { color: 'verde' as const,   pts: '2 pts', desc: 'Acertó ganador + uno de los dos scores exactos' },
            { color: 'amarillo' as const, pts: '1 pt',  desc: 'Acertó solo el ganador (ningún score exacto)' },
            { color: 'gris' as const,    pts: '0 pts', desc: 'No acertó el ganador/empate' },
          ].map(({ color, pts, desc }) => (
            <div key={color} className="flex items-start gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${POINT_COLORS[color]}`}>{pts}</span>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ejemplos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Ejemplos Prácticos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left py-2 font-medium">Pronóstico</th>
                <th className="text-left py-2 font-medium">Resultado real</th>
                <th className="text-left py-2 font-medium">Descripción</th>
                <th className="text-center py-2 font-medium">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((e) => (
                <tr key={e.label} className="border-b border-gray-50">
                  <td className="py-2 font-mono font-bold text-[#001A4B]">{e.bet}</td>
                  <td className="py-2 font-mono font-bold text-gray-600">{e.result}</td>
                  <td className="py-2 text-gray-600 text-xs">{e.label}</td>
                  <td className="py-2 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${POINT_COLORS[e.color]}`}>
                      {e.pts}{e.bonus && ' 🎯'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Criterios de desempate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Criterios de Desempate</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          <li>Mayor cantidad de puntos totales</li>
          <li>Mayor cantidad de <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${POINT_COLORS.celeste}`}>celstes</span> (4 pts)</li>
          <li>Mayor cantidad de <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${POINT_COLORS.rojo}`}>rojos</span> (3 pts)</li>
          <li>Mayor cantidad de <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${POINT_COLORS.verde}`}>verdes</span> (2 pts)</li>
          <li>Mayor cantidad de <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${POINT_COLORS.amarillo}`}>amarillos</span> (1 pt)</li>
        </ol>
      </div>

      {/* Reglas generales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Reglas Generales</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>✅ Podés editar tus pronósticos hasta el cierre (30 minutos antes del partido por defecto)</li>
          <li>✅ Solo participan en el ranking oficial las planillas con <strong>precio pagado</strong></li>
          <li>✅ Podés tener múltiples planillas, cada una compite por separado</li>
          <li>✅ El ranking se actualiza automáticamente al publicar cada resultado</li>
          <li>⚠️ Los resultados en tiempo extra o penales cuentan tal como terminaron</li>
        </ul>
      </div>
    </div>
  )
}
