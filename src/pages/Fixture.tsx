import { useState, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useT } from '@/hooks/useT'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Team {
  es: string
  pt: string
  code: string       // ISO 3166-1 alpha-2 for flagcdn.com, '' for play-offs
  playoff?: string   // display text for play-off slots
}

interface Group {
  id: string
  teams: Team[]
}

const FLAG = (code: string) => `https://flagcdn.com/20x15/${code}.png`

const GROUPS: Group[] = [
  { id: 'A', teams: [
    { es: 'México',          pt: 'México',           code: 'mx' },
    { es: 'Sudáfrica',       pt: 'África do Sul',    code: 'za' },
    { es: 'Corea del Sur',   pt: 'Coreia do Sul',    code: 'kr' },
    { es: 'PLAY-OFF D',      pt: 'PLAY-OFF D',       code: '', playoff: 'PLAY-OFF D' },
  ]},
  { id: 'B', teams: [
    { es: 'Canadá',          pt: 'Canadá',           code: 'ca' },
    { es: 'PLAY-OFF A',      pt: 'PLAY-OFF A',       code: '', playoff: 'PLAY-OFF A' },
    { es: 'Catar',           pt: 'Catar',            code: 'qa' },
    { es: 'Suiza',           pt: 'Suíça',            code: 'ch' },
  ]},
  { id: 'C', teams: [
    { es: 'Brasil',          pt: 'Brasil',           code: 'br' },
    { es: 'Marruecos',       pt: 'Marrocos',         code: 'ma' },
    { es: 'Haití',           pt: 'Haiti',            code: 'ht' },
    { es: 'Escocia',         pt: 'Escócia',          code: 'gb-sct' },
  ]},
  { id: 'D', teams: [
    { es: 'Estados Unidos',  pt: 'Estados Unidos',   code: 'us' },
    { es: 'Paraguay',        pt: 'Paraguai',         code: 'py' },
    { es: 'Australia',       pt: 'Austrália',        code: 'au' },
    { es: 'PLAY-OFF C',      pt: 'PLAY-OFF C',       code: '', playoff: 'PLAY-OFF C' },
  ]},
  { id: 'E', teams: [
    { es: 'Alemania',        pt: 'Alemanha',         code: 'de' },
    { es: 'Curazao',         pt: 'Curaçao',          code: 'cw' },
    { es: 'Costa de Marfil', pt: 'Costa do Marfim',  code: 'ci' },
    { es: 'Ecuador',         pt: 'Equador',          code: 'ec' },
  ]},
  { id: 'F', teams: [
    { es: 'Países Bajos',    pt: 'Países Baixos',    code: 'nl' },
    { es: 'Japón',           pt: 'Japão',            code: 'jp' },
    { es: 'PLAY-OFF B',      pt: 'PLAY-OFF B',       code: '', playoff: 'PLAY-OFF B' },
    { es: 'Túnez',           pt: 'Tunísia',          code: 'tn' },
  ]},
  { id: 'G', teams: [
    { es: 'Bélgica',         pt: 'Bélgica',          code: 'be' },
    { es: 'Egipto',          pt: 'Egito',            code: 'eg' },
    { es: 'Irán',            pt: 'Irã',              code: 'ir' },
    { es: 'Nueva Zelanda',   pt: 'Nova Zelândia',    code: 'nz' },
  ]},
  { id: 'H', teams: [
    { es: 'España',          pt: 'Espanha',          code: 'es' },
    { es: 'Cabo Verde',      pt: 'Cabo Verde',       code: 'cv' },
    { es: 'Arabia Saudita',  pt: 'Arábia Saudita',   code: 'sa' },
    { es: 'Uruguay',         pt: 'Uruguay',          code: 'uy' },
  ]},
  { id: 'I', teams: [
    { es: 'Francia',         pt: 'França',           code: 'fr' },
    { es: 'Senegal',         pt: 'Senegal',          code: 'sn' },
    { es: 'PLAY-OFF 2',      pt: 'PLAY-OFF 2',       code: '', playoff: 'PLAY-OFF 2' },
    { es: 'Noruega',         pt: 'Noruega',          code: 'no' },
  ]},
  { id: 'J', teams: [
    { es: 'Argentina',       pt: 'Argentina',        code: 'ar' },
    { es: 'Argelia',         pt: 'Argélia',          code: 'dz' },
    { es: 'Austria',         pt: 'Áustria',          code: 'at' },
    { es: 'Jordania',        pt: 'Jordânia',         code: 'jo' },
  ]},
  { id: 'K', teams: [
    { es: 'Portugal',        pt: 'Portugal',         code: 'pt' },
    { es: 'PLAY-OFF 1',      pt: 'PLAY-OFF 1',       code: '', playoff: 'PLAY-OFF 1' },
    { es: 'Uzbekistán',      pt: 'Uzbequistão',      code: 'uz' },
    { es: 'Colombia',        pt: 'Colômbia',         code: 'co' },
  ]},
  { id: 'L', teams: [
    { es: 'Inglaterra',      pt: 'Inglaterra',       code: 'gb-eng' },
    { es: 'Croacia',         pt: 'Croácia',          code: 'hr' },
    { es: 'Ghana',           pt: 'Gana',             code: 'gh' },
    { es: 'Panamá',          pt: 'Panamá',           code: 'pa' },
  ]},
]

const FEATURED = {
  es: { team: 'ARGENTINA', groupId: 'J', groupLabel: 'Grupo J', code: 'ar', flag: '🇦🇷' },
  pt: { team: 'BRASIL',    groupId: 'C', groupLabel: 'Grupo C', code: 'br', flag: '🇧🇷' },
}

const HISTORY = {
  es: [
    { year: '1978', host: 'Argentina',      final: 'Argentina 3 – 1 Holanda (ET)' },
    { year: '1986', host: 'México',         final: 'Argentina 3 – 2 Alemania' },
    { year: '2022', host: 'Qatar',          final: 'Argentina 3 – 3 Francia (4-2 pen.)' },
  ],
  pt: [
    { year: '1958', host: 'Suecia',         final: 'Brasil 5 – 2 Suecia' },
    { year: '1962', host: 'Chile',          final: 'Brasil 3 – 1 Checoslovaquia' },
    { year: '1970', host: 'México',         final: 'Brasil 4 – 1 Italia' },
    { year: '1994', host: 'Estados Unidos', final: 'Brasil 0 – 0 Italia (3-2 pen.)' },
    { year: '2002', host: 'Japón / Corea',  final: 'Brasil 2 – 0 Alemania' },
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Fixture() {
  const { user } = useAuthStore()
  const t = useT()
  const tf = t.fixture
  const isPT = user?.idioma_pref === 'pt'
  const lang = isPT ? 'pt' : 'es'
  const featured = FEATURED[lang]

  const [showHistory, setShowHistory] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null)
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = isPT ? '/fixture_pt.png' : '/fixture_ar.png'
    a.download = isPT ? 'fixture-copa-2026.png' : 'fixture-mundial-2026.png'
    a.click()
  }

  const handleShare = async () => {
    const text = tf.shareText
    if (navigator.share) {
      try { await navigator.share({ text, url: 'https://chicago.prodecaballito.com' }); return } catch {}
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleViewPath = () => {
    const el = groupRefs.current[featured.groupId]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightGroup(featured.groupId)
    setTimeout(() => setHighlightGroup(null), 2000)
  }

  return (
    <div className="pb-0">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🗓️</span>
            <h1 className="text-base font-bold t-text-nav">{tf.title}</h1>
          </div>
          <p className="text-xs font-semibold ml-8 mt-0.5" style={{ color: 'var(--theme-primary)' }}>
            {tf.subtitle}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'var(--theme-primary)', color: 'var(--theme-on-primary, #fff)' }}
        >
          ⬇ {tf.download}
        </button>
      </div>

      {/* ── Dark bracket section ──────────────────────────────────────────── */}
      <div className="bg-[#006d2e]">

        {/* Section title */}
        <div className="text-center pt-6 pb-4 px-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{featured.flag}</span>
            <h2 className="text-xl font-black text-white tracking-wider">{tf.worldCup}</h2>
            <span className="text-2xl">{featured.flag}</span>
          </div>
          <p className="text-[#75AADB] text-[11px] font-bold tracking-[0.2em] uppercase">{tf.path}</p>
        </div>

        {/* Groups grid + Sidebar */}
        <div className="max-w-6xl mx-auto px-3 pb-6 flex flex-col lg:flex-row gap-4">

          {/* Groups grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {GROUPS.map(group => {
              const isFeatured = group.id === featured.groupId
              const isHighlighted = highlightGroup === group.id
              return (
                <div
                  key={group.id}
                  ref={el => { groupRefs.current[group.id] = el }}
                  className={[
                    'rounded-lg overflow-hidden border transition-all duration-500',
                    isFeatured
                      ? 'border-[#75AADB] shadow-[0_0_14px_rgba(117,170,219,0.45)]'
                      : 'border-white/10',
                    isHighlighted ? 'scale-[1.04] shadow-[0_0_24px_rgba(117,170,219,0.8)]' : '',
                  ].join(' ')}
                >
                  {/* Group header */}
                  <div className={`px-2 py-1.5 text-center ${isFeatured ? 'bg-[#75AADB]/20' : 'bg-white/10'}`}>
                    <span className="text-[10px] font-bold tracking-widest text-white/90">
                      {tf.group} {group.id}
                    </span>
                  </div>
                  {/* Teams */}
                  <div className="bg-white/5 divide-y divide-white/5">
                    {group.teams.map((team, i) => {
                      const name = isPT ? team.pt : team.es
                      const isStar = team.code === featured.code
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2 py-[5px] ${isStar ? 'bg-white/10' : ''}`}
                        >
                          {team.code ? (
                            <img
                              src={FLAG(team.code)}
                              alt=""
                              className="w-5 h-[14px] object-cover rounded-[2px] shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : (
                            <span className="text-[8px] font-bold text-white/30 w-5 shrink-0 text-center">FIFA</span>
                          )}
                          <span className={`text-[11px] leading-tight truncate ${isStar ? 'text-white font-bold' : 'text-white/75'}`}>
                            {team.playoff ?? name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="lg:w-60 flex flex-col sm:flex-row lg:flex-col gap-3">

            {/* Featured team card */}
            <div className="flex-1 lg:flex-none bg-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={FLAG(featured.code)}
                  alt={featured.team}
                  className="w-12 h-8 object-cover rounded shadow"
                />
                <div>
                  <div className="font-black text-[#006d2e] text-base leading-tight">{featured.team}</div>
                  <div className="text-xs text-gray-400 font-medium">{featured.groupLabel}</div>
                </div>
              </div>
              <button
                onClick={handleViewPath}
                className="w-full py-2 rounded-lg text-xs font-bold t-text-on-primary transition hover:brightness-110 active:scale-95"
                style={{ background: 'var(--theme-primary)' }}
              >
                {tf.viewPath}
              </button>
            </div>

            {/* Tournament info */}
            <div className="flex-1 lg:flex-none bg-white rounded-xl p-4 shadow-lg space-y-2.5">
              <InfoRow icon="📅" label={tf.worldCupStart} value={tf.startDate} />
              <InfoRow icon="🏆" label={tf.finalLabel}    value={tf.finalDate} />
              <InfoRow icon="📍" label={tf.venues}        value={tf.venuesValue} />
              <InfoRow icon="⚽" label={tf.teams}         value={tf.teamsValue} />
            </div>

            {/* History card */}
            <div
              className="flex-1 lg:flex-none rounded-xl p-4 shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg, #006d2e 0%, #0a3272 100%)' }}
            >
              <div className="text-xs font-black tracking-wider leading-snug whitespace-pre-line mb-2">
                {tf.historyTitle}
              </div>
              <div className="text-xl mb-1">{tf.historyStars}</div>
              <div className="text-[10px] text-white/50 mb-3">{tf.historyYears}</div>
              <button
                onClick={() => setShowHistory(true)}
                className="text-xs font-bold text-[#75AADB] hover:text-white transition underline underline-offset-2"
              >
                {tf.viewHistory}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ── Bottom banner ─────────────────────────────────────────────────── */}
      <div className="bg-[#001020] py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">🏆</span>
            <div className="min-w-0">
              <div className="text-white font-black text-sm truncate">{tf.bannerTitle}</div>
              <div className="text-white/50 text-xs truncate">{tf.bannerSubtitle}</div>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
          >
            {copied ? tf.copied : `↗ ${tf.share}`}
          </button>
        </div>
      </div>

      {/* ── History modal ─────────────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-[#006d2e] text-lg mb-4">{tf.modalHistoryTitle}</h3>
            <div className="space-y-2.5">
              {HISTORY[lang].map(c => (
                <div
                  key={c.year}
                  className={`flex items-center gap-3 p-3 rounded-xl ${isPT ? 'bg-yellow-50' : 'bg-blue-50'}`}
                >
                  <span className="text-2xl shrink-0">⭐</span>
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{c.year} · {c.host}</div>
                    <div className="text-xs text-gray-500">{c.final}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="mt-5 w-full py-2 rounded-xl text-sm font-bold t-text-on-primary transition hover:brightness-110"
              style={{ background: 'var(--theme-primary)' }}
            >
              {tf.modalClose}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">{label}</div>
        <div className="text-xs font-bold text-gray-800 leading-tight">{value}</div>
      </div>
    </div>
  )
}
