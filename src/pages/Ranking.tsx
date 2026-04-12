import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import { POINT_COLORS } from '@/utils/scoring'
import type { RankingEntry } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']

export function Ranking() {
  const { user } = useAuthStore()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/ranking?limit=100').then(({ data }) => {
      setRanking(data.data.ranking)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const myEntry = ranking.find((r) => r.user_id === user?.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#001A4B]">🏆 Ranking</h1>

      {/* Mi posición */}
      {myEntry && (
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] rounded-xl p-4 text-white flex items-center gap-4">
          <div className="text-3xl font-black">#{myEntry.position}</div>
          <div className="flex-1">
            <p className="font-semibold">{myEntry.user_name}</p>
            <p className="text-white/60 text-xs">{myEntry.nombre_planilla}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#FFDF00]">{myEntry.puntos_totales}</p>
            <p className="text-white/60 text-xs">puntos</p>
          </div>
        </div>
      )}

      {/* Leyenda de colores */}
      <div className="flex gap-2 flex-wrap text-xs">
        {([['celeste','4pts+bonus'],['rojo','3pts exacto'],['verde','2pts parcial'],['amarillo','1pt tendencia']] as const).map(([color, label]) => (
          <span key={color} className={`px-2 py-0.5 rounded-full font-medium ${POINT_COLORS[color]}`}>{label}</span>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
          <span>#</span>
          <span>Jugador</span>
          <span className="text-center">Exactos</span>
          <span className="hidden sm:block text-center">🩵</span>
          <span className="text-right">Pts</span>
        </div>
        {ranking.map((r, i) => {
          const isMe = r.user_id === user?.id
          return (
            <div
              key={r.planilla_id}
              className={`grid grid-cols-[2rem_1fr_auto_auto_auto] gap-2 items-center px-4 py-3 ${i < ranking.length - 1 ? 'border-b border-gray-50' : ''} ${isMe ? 'bg-blue-50' : ''}`}
            >
              <span className="text-sm font-bold text-gray-400">
                {i < 3 ? MEDAL[i] : r.position}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                  {r.user_name} {isMe && <span className="text-xs">(vos)</span>}
                </p>
                <p className="text-xs text-gray-400 truncate">{r.nombre_planilla}
                  {!r.precio_pagado && <span className="ml-1 text-orange-400 font-medium">· no oficial</span>}
                </p>
              </div>
              <span className="text-xs text-center text-gray-600">{r.exactos_count}</span>
              <span className={`text-xs text-center hidden sm:block px-1.5 py-0.5 rounded-full ${r.aciertos_celeste > 0 ? POINT_COLORS.celeste : 'text-gray-300'}`}>
                {r.aciertos_celeste || '—'}
              </span>
              <span className="font-black text-[#0042A5] text-right">{r.puntos_totales}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
