import { useState, useEffect } from 'react'

export function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null)

  useEffect(() => {
    if (!targetDate) { setTimeLeft(null); return }

    const calc = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ h, m, s })
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate?.getTime()])

  return timeLeft
}

export function formatCountdown(h: number, m: number, s: number) {
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}
