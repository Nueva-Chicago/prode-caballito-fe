import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import type { RankingEntry } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']

export function Ranking() {
  const { user } = useAuthStore()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RankingEntry | null>(null)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    api.get('/ranking?limit=100').then(({ data }) => {
      setRanking(data.data.ranking)
    }).finally(() => setLoading(false))
  }, [])

  const handleShare = async (r: RankingEntry) => {
    const text = `${r.user_name} está #${r.position} en el PRODE Caballito con ${r.puntos_totales} puntos 🏆`
    const url = window.location.origin + '/ranking'
    if (navigator.share) {
      await navigator.share({ title: 'PRODE Caballito', text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const myEntry = ranking.find((r) => r.user_id === user?.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#001A4B]">🏆 Ranking</h1>

      {/* Mi posición */}
      {myEntry && (
        <div
          onClick={() => setSelected(myEntry)}
          className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] rounded-xl p-4 text-white flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="text-3xl font-black">#{myEntry.position}</div>
          {myEntry.user_avatar
            ? <img src={myEntry.user_avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                {myEntry.user_name[0].toUpperCase()}
              </div>
          }
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

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
          <span>#</span>
          <span>Jugador</span>
          <span className="text-center">Exactos</span>
          <span className="text-right">Pts</span>
        </div>
        {ranking.map((r, i) => {
          const isMe = r.user_id === user?.id
          return (
            <div
              key={r.planilla_id}
              onClick={() => setSelected(r)}
              className={`grid grid-cols-[2rem_1fr_auto_auto] gap-2 items-center px-4 py-3 cursor-pointer transition-colors ${i < ranking.length - 1 ? 'border-b border-gray-50' : ''} ${isMe ? 'bg-blue-50 hover:bg-blue-100/70' : 'hover:bg-gray-50'}`}
            >
              <span className="text-sm font-bold text-gray-400">
                {i < 3 ? MEDAL[i] : r.position}
              </span>
              <div className="min-w-0 flex items-center gap-2.5">
                {r.user_avatar
                  ? <img src={r.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                  : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {r.user_name[0].toUpperCase()}
                    </div>
                }
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                    {r.user_name} {isMe && <span className="text-xs font-normal">(vos)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{r.nombre_planilla}
                    {!r.precio_pagado && <span className="ml-1 text-orange-400 font-medium">· no oficial</span>}
                  </p>
                </div>
              </div>
              <span className="text-xs text-center text-gray-600">{r.exactos_count}</span>
              <span className="font-black text-[#0042A5] text-right">{r.puntos_totales}</span>
            </div>
          )
        })}
      </div>

      {/* Drawer / modal de jugador */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          {/* Panel */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto animate-slide-up"
            style={{ animation: 'slideUp 0.25s ease-out both' }}
          >
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
              }
            `}</style>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="px-6 pt-3 pb-5">
              <div className="flex items-center gap-4">
                {/* Avatar grande */}
                {selected.user_avatar
                  ? <img src={selected.user_avatar} alt="" className="w-16 h-16 rounded-full object-cover border-4 border-[#0042A5]/20 shrink-0" />
                  : <div className="w-16 h-16 rounded-full bg-[#0042A5] flex items-center justify-center text-2xl font-black text-white shrink-0">
                      {selected.user_name[0].toUpperCase()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black">
                      {selected.position <= 3 ? MEDAL[selected.position - 1] : `#${selected.position}`}
                    </span>
                    <h2 className="text-base font-bold text-[#001A4B] truncate">{selected.user_name}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{selected.nombre_planilla}</p>
                  {!selected.precio_pagado && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">No oficial</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-3xl font-black text-[#0042A5]">{selected.puntos_totales}</p>
                  <p className="text-xs text-gray-400">puntos</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: 'Exactos', value: selected.exactos_count, color: 'text-red-500' },
                  { label: '+Bonus', value: selected.aciertos_celeste, color: 'text-sky-500' },
                  { label: 'Parciales', value: selected.aciertos_verde, color: 'text-green-600' },
                  { label: 'Tendencia', value: selected.aciertos_amarillo, color: 'text-yellow-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value || 0}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div className="flex gap-3 mt-5">
                <Link
                  to={`/planilla/${selected.planilla_id}`}
                  className="flex-1 bg-[#001A4B] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#002870] transition-colors"
                  onClick={() => setSelected(null)}
                >
                  Ver planilla completa
                </Link>
                <button
                  onClick={() => handleShare(selected)}
                  className="flex-1 border-2 border-[#001A4B] text-[#001A4B] text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {shared ? '✓ Copiado' : '↗ Compartir'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
