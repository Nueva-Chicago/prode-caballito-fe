import { useEffect, useState } from 'react'
import { api } from '@/api/client'

interface WinnerData {
  image_url: string
  matchday_label?: string
  updated_at?: string
}

export function GanadoresModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<WinnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get('/config/ganador_fecha')
      .then(r => {
        const row = r.data?.data
        if (!row?.value) { setError(true); return }
        setData(JSON.parse(row.value))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#006d2e' }}>
          <h2 className="text-white font-bold text-lg">
            🏆 {data?.matchday_label ?? 'Ganador de la Fecha'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl leading-none transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="bg-white">
          {loading && (
            <div className="flex items-center justify-center p-16 text-gray-400 text-sm">
              Cargando...
            </div>
          )}
          {!loading && (error || !data?.image_url) && (
            <div className="flex flex-col items-center justify-center p-16 text-gray-400 text-sm gap-2">
              <span className="text-4xl">🏆</span>
              <p>No hay imagen disponible todavía</p>
            </div>
          )}
          {!loading && !error && data?.image_url && (
            <img
              src={data.image_url}
              alt={data.matchday_label ?? 'Ganador de la fecha'}
              className="w-full block"
            />
          )}
        </div>
      </div>
    </div>
  )
}
