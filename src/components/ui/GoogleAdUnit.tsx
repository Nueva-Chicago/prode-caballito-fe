import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { adsbygoogle: unknown[] }
}

interface Props {
  slot: string
  format?: string
}

export function GoogleAdUnit({ slot, format = 'auto' }: Props) {
  const insRef = useRef<HTMLModElement>(null)
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}

    const el = insRef.current
    if (!el) return

    const observer = new MutationObserver(() => {
      if (el.getAttribute('data-ad-status') === 'filled') {
        setFilled(true)
        observer.disconnect()
      }
    })
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={filled
      ? { opacity: 1, transition: 'opacity 0.3s' }
      : { height: 0, overflow: 'hidden', margin: 0, padding: 0 }
    }>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2237175852397146"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
