import { useEffect } from 'react'

declare global {
  interface Window { adsbygoogle: unknown[] }
}

interface Props {
  slot: string
  format?: string
  style?: React.CSSProperties
}

export function GoogleAdUnit({ slot, format = 'auto', style }: Props) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', ...style }}
      data-ad-client="ca-pub-2237175852397146"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}
