import { useAuthStore } from '@/store/authStore'

export function Fixture() {
  const { user } = useAuthStore()
  const isPortugues = user?.idioma_pref === 'pt'
  const imgSrc = isPortugues ? '/fixture_pt.png' : '/fixture_ar.png'
  const alt = isPortugues ? 'Fixture Copa do Mundo 2026' : 'Fixture Mundial 2026'

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = imgSrc
    a.download = isPortugues ? 'fixture-copa-2026.png' : 'fixture-mundial-2026.png'
    a.click()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold t-text-nav">
          🗓️ {isPortugues ? 'Fixture Copa do Mundo 2026' : 'Fixture Mundial 2026'}
        </h1>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'var(--theme-primary)', color: '#fff' }}
        >
          ↓ Descargar
        </button>
      </div>

      {/* Imagen zoomeable */}
      <div
        className="rounded-2xl overflow-auto shadow-xl border border-gray-200"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pinch-zoom' }}
      >
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-auto block"
          style={{ minWidth: 600 }}
        />
      </div>

      <p className="text-center text-[10px] t-text-muted mt-3">
        Pellizca para hacer zoom · Deslizá para explorar
      </p>
    </div>
  )
}
