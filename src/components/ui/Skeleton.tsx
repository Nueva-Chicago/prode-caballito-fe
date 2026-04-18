/** Primitive skeleton block — animate-pulse gray rectangle */
export function Sk({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

/** Circular avatar skeleton */
export function SkAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }[size]
  return <div className={`animate-pulse bg-gray-200 rounded-full shrink-0 ${s}`} />
}

/** Full MatchCard skeleton — mimics 3-column body + footer */
export function SkMatchCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* tournament header strip */}
      <div className="bg-gray-100 h-6" />
      {/* body: local | VS | away */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-4 py-4">
        <div className="flex flex-col items-center gap-1.5">
          <Sk className="w-10 h-10 rounded-full" />
          <Sk className="h-2.5 w-16" />
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 px-2">
          <Sk className="h-6 w-10 rounded-lg" />
          <Sk className="h-2.5 w-14" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Sk className="w-10 h-10 rounded-full" />
          <Sk className="h-2.5 w-16" />
        </div>
      </div>
      {/* footer */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Sk className="h-5 w-20 rounded-full" />
        <Sk className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  )
}

/** Ranking table row skeleton — matches grid-cols-[2rem_1fr_auto_auto_2rem] */
export function SkRankRow() {
  return (
    <div className="grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 items-center px-4 py-3 border-b border-gray-50">
      <Sk className="h-4 w-4" />
      <div className="flex items-center gap-2.5">
        <SkAvatar size="sm" />
        <div className="space-y-1.5 min-w-0">
          <Sk className="h-3 w-24" />
          <Sk className="h-2.5 w-16" />
        </div>
      </div>
      <Sk className="h-3 w-5" />
      <Sk className="h-4 w-7" />
      <Sk className="h-4 w-4 rounded-full" />
    </div>
  )
}
