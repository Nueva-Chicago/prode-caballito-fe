import { POINT_COLORS } from '@/utils/scoring'

const examples = [
  {
    num: 1,
    bet: 'ARG 2 - JOR 1', result: 'ARG 1 - JOR 0',
    pts: 1, color: 'amarillo' as const,
    explain: 'Acierta el resultado global (ganador Argentina), pero ninguno de los 2 tanteadores.',
  },
  {
    num: 2,
    bet: 'ARG 2 - JOR 0', result: 'ARG 1 - JOR 0',
    pts: 2, color: 'verde' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y un tanteador exacto (Jordania 0).',
  },
  {
    num: 3,
    bet: 'ARG 2 - JOR 1', result: 'ARG 2 - JOR 0',
    pts: 2, color: 'verde' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y un tanteador exacto (Argentina 2).',
  },
  {
    num: 4,
    bet: 'ARG 2 - JOR 1', result: 'ARG 2 - JOR 1',
    pts: 3, color: 'rojo' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y ambos tanteadores exactos.',
  },
  {
    num: 5,
    bet: 'ARG 2 - JOR 1', result: 'ARG 0 - JOR 1',
    pts: 0, color: 'gris' as const,
    explain: 'No acierta el resultado global (ganó Jordania), a pesar de haber acertado el tanteador de Jordania.',
  },
  {
    num: 6,
    bet: 'ARG 1 - JOR 1', result: 'ARG 1 - JOR 1',
    pts: 3, color: 'rojo' as const,
    explain: 'Acierta el resultado global (empate) y ambos tanteadores exactos.',
  },
  {
    num: 7,
    bet: 'ARG 1 - JOR 1', result: 'ARG 0 - JOR 0',
    pts: 1, color: 'amarillo' as const,
    explain: 'Acierta el resultado global (empate) pero ninguno de los 2 tanteadores.',
  },
  {
    num: 8,
    bet: 'ARG 3 - JOR 2', result: 'ARG 3 - JOR 2',
    pts: 4, color: 'celeste' as const,
    explain: 'BONUS: resultado exacto con 5 goles en total (≥ 4 goles). Se suma 1 punto extra.',
  },
]

export function Reglamento() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">

      {/* Header */}
      <div className="bg-[#001A4B] text-white rounded-2xl p-5 text-center space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#FFDF00] uppercase">Después de 4 años</p>
        <h1 className="text-xl font-black">⚽ Vuelve el PRODE del MUNDIAL ⚽</h1>
        <p className="text-sm text-white/70">Instructivo oficial — leelo antes de arrancar</p>
      </div>

      {/* Intro */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          El prode consiste en ponerle un <strong>resultado exacto a cada uno de los 72 partidos</strong> de la fase de clasificación del Mundial.
        </p>
        <p>
          Una vez completados los resultados de todos los partidos, se debe <strong>abonar antes de que comience el primer partido</strong>. A medida que se conozcan los resultados finales de cada partido — <em>dentro de los 90 minutos</em> (no cuentan alargues ni penales) — se sumarán los puntos.
        </p>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          💡 Para completar resultados usá el formato <strong>2-0</strong> (sin espacios).
        </p>
      </div>

      {/* Sistema de puntaje */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Sistema de Puntuación</h2>
        <div className="space-y-2">
          {([
            { color: 'celeste' as const, pts: '4 pts', desc: 'Resultado exacto + ambos goles exactos + 4 o más goles en total (BONUS)' },
            { color: 'rojo'    as const, pts: '3 pts', desc: 'Resultado exacto: acertó ganador/empate y ambos tanteadores' },
            { color: 'verde'   as const, pts: '2 pts', desc: 'Acertó ganador/empate y uno de los dos tanteadores exactos' },
            { color: 'amarillo'as const, pts: '1 pt',  desc: 'Acertó solo el ganador o empate (ningún tanteador exacto)' },
            { color: 'gris'    as const, pts: '0 pts', desc: 'No acertó el resultado global (ganador o empate)' },
          ]).map(({ color, pts, desc }) => (
            <div key={color} className="flex items-start gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${POINT_COLORS[color]}`}>{pts}</span>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
          El resultado global es: quién ganó o si hubo empate. Sin importar los goles, si no acertás el resultado global sumás 0.
        </p>
      </div>

      {/* Ejemplos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-[#001A4B] text-base">Ejemplos Prácticos</h2>
        <div className="space-y-3">
          {examples.map((e) => (
            <div key={e.num} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-gray-500">Ejemplo {e.num}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${POINT_COLORS[e.color]}`}>
                  {e.pts === 4 ? '4 pts 🎯' : `${e.pts} pt${e.pts !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Pronóstico</span>
                    <p className="font-mono font-bold text-[#0042A5]">{e.bet}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Resultado real</span>
                    <p className="font-mono font-bold text-[#001A4B]">{e.result}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{e.explain}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Precio y formato */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Participación</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="shrink-0">🎫</span><span>Cada planilla tiene un valor de <strong>$20.000</strong>.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">📋</span><span>Podés participar con <strong>la cantidad de planillas que quieras</strong>, cada una compite por separado.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">💰</span><span>El total acumulado va para <strong>un único ganador</strong> (el que sume más puntos).</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">⏰</span><span>El pago debe realizarse antes del inicio del primer partido.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">👁️</span><span>Minutos antes del inicio del primer partido, todos tendrán acceso a la planilla general con todos los pronósticos de todos los participantes.</span></li>
        </ul>
      </div>

      {/* Criterios de desempate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Criterios de Desempate</h2>
        <p className="text-xs text-gray-500">Solo habrá un ganador. En caso de empate se aplican estos criterios en orden:</p>
        <ol className="space-y-2">
          {[
            { label: 'Mayor cantidad de', badge: 'celeste' as const, suffix: '(4 pts)' },
            { label: 'Mayor cantidad de', badge: 'rojo'    as const, suffix: '(3 pts)' },
            { label: 'Mayor cantidad de', badge: 'verde'   as const, suffix: '(2 pts)' },
            { label: 'Mayor cantidad de', badge: 'amarillo'as const, suffix: '(1 pt)'  },
          ].map(({ label, badge, suffix }, i) => (
            <li key={badge} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-5 h-5 rounded-full bg-[#001A4B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              {label} <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${POINT_COLORS[badge]}`}>{badge}</span> {suffix}
            </li>
          ))}
          <li className="flex items-start gap-2 text-xs text-gray-400 mt-1">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
            Si persiste el empate: gana quien haya obtenido primero un puntaje de color celeste, rojo, verde o amarillo (en ese orden).
          </li>
        </ol>
      </div>

      {/* Reglas generales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2">
        <h2 className="font-bold text-[#001A4B] text-base">Reglas Generales</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span> Los resultados cuentan en los <strong>90 minutos</strong>. No cuentan alargues ni penales.</li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span> Podés editar tus pronósticos hasta el cierre (minutos antes del partido).</li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span> Solo participan en el ranking oficial las planillas con <strong>precio pagado</strong>.</li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span> El ranking se actualiza automáticamente al publicar cada resultado.</li>
          <li className="flex items-start gap-2"><span className="shrink-0">📊</span> La app tiene estadísticas, podios, campeonatos de amigos por estrellas y más.</li>
          <li className="flex items-start gap-2"><span className="shrink-0">💬</span> Ante cualquier duda, comunicate por WhatsApp.</li>
        </ul>
      </div>

      <p className="text-center text-sm text-gray-400 pb-2">¡Buena suerte a todos! 🏆</p>
    </div>
  )
}
