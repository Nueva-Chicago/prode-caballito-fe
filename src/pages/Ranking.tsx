import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'
import { Sk, SkRankRow } from '@/components/ui/Skeleton'

function RankingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Sk className="h-7 w-32" />
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3].map(i => <Sk key={i} className="h-9 w-20 rounded-full" />)}
      </div>
      <div className="t-gradient-hero rounded-xl p-4 flex items-center gap-4">
        <div className="animate-pulse bg-white/20 h-8 w-8 rounded" />
        <div className="animate-pulse bg-white/20 rounded-full w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="animate-pulse bg-white/30 h-4 w-28 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-16 rounded" />
        </div>
        <div className="space-y-1">
          <div className="animate-pulse bg-white/30 h-7 w-10 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-12 rounded" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 h-9 border-b border-gray-100" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <SkRankRow key={i} />)}
      </div>
    </div>
  )
}

function RankingContentSkeleton() {
  return (
    <>
      <div className="t-gradient-hero rounded-xl p-4 flex items-center gap-4">
        <div className="animate-pulse bg-white/20 h-8 w-8 rounded" />
        <div className="animate-pulse bg-white/20 rounded-full w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="animate-pulse bg-white/30 h-4 w-28 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-16 rounded" />
        </div>
        <div className="space-y-1">
          <div className="animate-pulse bg-white/30 h-7 w-10 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-12 rounded" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 h-9 border-b border-gray-100" />
        {[0, 1, 2, 3, 4, 5].map(i => <SkRankRow key={i} />)}
      </div>
    </>
  )
}
import type { RankingEntry } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']


export function Ranking() {
  const { user } = useAuthStore()
  const t = useT()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RankingEntry | null>(null)
  const [shared, setShared] = useState(false)

  // Favoritos
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [favBannerVisible, setFavBannerVisible] = useState(
    () => localStorage.getItem('prode_fav_banner_v2') !== '0'
  )
  const closeFavBanner = () => {
    localStorage.setItem('prode_fav_banner_v2', '0')
    setFavBannerVisible(false)
  }

  useEffect(() => {
    Promise.allSettled([
      api.get('/ranking?limit=500'),
      api.get('/ranking/favorites').catch(() => ({ data: { data: [] } })),
    ]).then(([rRes, fRes]) => {
      if (rRes.status === 'fulfilled') setRanking(rRes.value.data.data.ranking || [])
      if (fRes.status === 'fulfilled') setFavorites(new Set(fRes.value.data.data || []))
    }).finally(() => setLoading(false))
  }, [])

  // Filtro de favoritos aplicado sobre el ranking — siempre incluye las planillas propias
  const displayRanking = showOnlyFavorites
    ? ranking.filter(r => favorites.has(r.planilla_id) || r.user_id === user?.id)
    : ranking

  const isLoadingDisplay = loading

  const handleShare = async (r: RankingEntry) => {
    const text = t.ranking.shareText(r.user_name, r.position, r.puntos_totales)
    const url = window.location.origin + '/ranking'
    if (navigator.share) {
      await navigator.share({ title: 'PRODE Caballito', text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleToggleFavorite = useCallback(async (planillaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingFav) return
    setTogglingFav(planillaId)
    try {
      const { data } = await api.post(`/ranking/favorites/${planillaId}`, {})
      setFavorites(prev => {
        const next = new Set(prev)
        if (data.action === 'added') next.add(planillaId)
        else next.delete(planillaId)
        return next
      })
    } catch { /* silent */ } finally {
      setTogglingFav(null)
    }
  }, [togglingFav])

  const myEntry = ranking.find((r) => r.user_id === user?.id)

  if (loading) return <RankingSkeleton />

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold t-text-nav">{t.ranking.title}</h1>

      {/* Favoritos */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowOnlyFavorites(v => !v)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            showOnlyFavorites
              ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300 hover:text-yellow-600'
          }`}
        >
          {t.ranking.favorites}
          {favorites.size > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${showOnlyFavorites ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {favorites.size}
            </span>
          )}
        </button>

      </div>

      {/* Banner explicativo — cerrable, se recuerda con localStorage */}
      {favBannerVisible && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">⭐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-yellow-900">{t.ranking.favHintTitle}</p>
            <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">{t.ranking.favHintDesc}</p>
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs text-yellow-700"><span className="font-semibold">1.</span> {t.ranking.favStep1}</p>
              <p className="text-xs text-yellow-700"><span className="font-semibold">2.</span> {t.ranking.favStep2}</p>
              <p className="text-xs text-yellow-700"><span className="font-semibold">3.</span> {t.ranking.favStep3}</p>
            </div>
          </div>
          <button
            onClick={closeFavBanner}
            className="shrink-0 text-yellow-400 hover:text-yellow-700 transition-colors text-xl leading-none mt-0.5"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {isLoadingDisplay ? (
        <RankingContentSkeleton />
      ) : (
        <>
          {/* Mi posición */}
          {myEntry && !showOnlyFavorites && (
            <div
              onClick={() => setSelected(myEntry)}
              className="t-gradient-hero rounded-xl p-4 text-white flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
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
                <p className="text-white/60 text-xs">{t.ranking.globalLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black t-text-secondary">{myEntry.puntos_totales}</p>
                <p className="text-white/60 text-xs">{t.ranking.points}</p>
              </div>
            </div>
          )}

          {showOnlyFavorites && displayRanking.length === 0 && (
            <EmptyState
              icon="⭐"
              message={`${t.ranking.noFavorites}. ${t.ranking.noFavoritesDesc}`}
              action={{ label: t.ranking.favHintCta, onClick: () => setShowOnlyFavorites(false) }}
            />
          )}

          {/* Tabla */}
          {displayRanking.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {showOnlyFavorites && (
                <div className="t-bg-nav px-4 py-2 flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">⭐</span>
                  <p className="text-xs font-semibold text-white/80">{t.ranking.favorites}</p>
                </div>
              )}
              <div className="grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                <span>#</span>
                <span>{t.ranking.player}</span>
                <span className="text-center">{t.ranking.exact}</span>
                <span className="text-right">{t.ranking.pts}</span>
                <span />
              </div>
              {displayRanking.map((r, i) => {
                const isMe = r.user_id === user?.id
                const isFav = favorites.has(r.planilla_id)
                const isToggling = togglingFav === r.planilla_id
                return (
                  <div
                    key={r.planilla_id}
                    onClick={() => setSelected(r)}
                    className={`grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 items-center px-4 py-3 cursor-pointer transition-colors ${i < displayRanking.length - 1 ? 'border-b border-gray-50' : ''} ${isMe ? 't-row-me' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-sm font-bold text-gray-400">
                      {i < 3 ? MEDAL[i] : r.position}
                    </span>
                    <div className="min-w-0 flex items-center gap-2.5">
                      {r.user_avatar
                        ? <img src={r.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                        : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 't-bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {r.user_name[0].toUpperCase()}
                          </div>
                      }
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? 't-text-primary' : 't-text-nav'}`}>
                          {r.user_name} {isMe && <span className="text-xs font-normal">{t.ranking.you}</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{r.nombre_planilla}
                          {!r.precio_pagado && <span className="ml-1 text-orange-400 font-medium">· {t.ranking.noOfficial}</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-center text-gray-600">{r.exactos_count}</span>
                    <span className="font-black t-text-primary text-right">{r.puntos_totales}</span>
                    {/* Botón favorito — no mostrar en fila propia */}
                    {!isMe ? (
                      <button
                        onClick={(e) => handleToggleFavorite(r.planilla_id, e)}
                        disabled={isToggling}
                        title={isFav ? t.ranking.unfollow : t.ranking.follow}
                        className={`text-base leading-none transition-all disabled:opacity-40 hover:scale-125 ${isFav ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                      >
                        {isToggling ? '…' : isFav ? '⭐' : '☆'}
                      </button>
                    ) : <span />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Drawer de jugador */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto"
            style={{ animation: 'slideUp 0.25s ease-out both' }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-6 pt-3 pb-5">
              <div className="flex items-center gap-4">
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
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium ml-1">{t.ranking.noOfficial}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-3xl font-black text-[#0042A5]">{selected.puntos_totales}</p>
                    <p className="text-xs text-gray-400">{t.ranking.points}</p>
                  </div>
                  {/* Favorito desde el drawer */}
                  {selected.user_id !== user?.id && (
                    <button
                      onClick={(e) => handleToggleFavorite(selected.planilla_id, e)}
                      disabled={togglingFav === selected.planilla_id}
                      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        favorites.has(selected.planilla_id)
                          ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
                      }`}
                    >
                      {favorites.has(selected.planilla_id) ? '⭐' : '☆'}
                      {favorites.has(selected.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: t.ranking.exact,     value: selected.exactos_count,    color: 'text-red-500' },
                  { label: t.ranking.extraBonus, value: selected.aciertos_celeste, color: 'text-sky-500' },
                  { label: t.ranking.partial,    value: selected.aciertos_verde,   color: 'text-green-600' },
                  { label: t.ranking.tendency,   value: selected.aciertos_amarillo, color: 'text-yellow-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value || 0}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <Link
                  to={`/planilla/${selected.planilla_id}`}
                  className="flex-1 bg-[#001A4B] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#002870] transition-colors"
                  onClick={() => setSelected(null)}
                >
                  {t.ranking.fullPlanilla}
                </Link>
                <button
                  onClick={() => handleShare(selected)}
                  className="flex-1 border-2 border-[#001A4B] text-[#001A4B] text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {shared ? t.ranking.copied : t.ranking.share}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
