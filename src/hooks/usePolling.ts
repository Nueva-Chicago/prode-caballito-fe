import { useEffect, useRef } from 'react'

/**
 * Runs callback every intervalMs, but pauses automatically when the tab is
 * hidden and resumes (with an immediate catch-up call) when it becomes visible.
 */
export function usePolling(callback: () => unknown, intervalMs: number, active = true) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!active) return

    let id: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (id !== null) return
      id = setInterval(() => cbRef.current(), intervalMs)
    }

    const stop = () => {
      if (id !== null) { clearInterval(id); id = null }
    }

    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        cbRef.current()
        start()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, active])
}
