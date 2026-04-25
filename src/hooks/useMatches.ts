import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import type { Match } from '@/types'

export function useMatches(limit = 200) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/matches?limit=${limit}`)
      setMatches(res.data.data.matches)
    } catch { /* caller handles empty state */ }
    finally { setLoading(false) }
  }, [limit])

  useEffect(() => { load() }, [load])

  return { matches, setMatches, loading, refetch: load }
}
