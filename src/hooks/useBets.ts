import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import type { Bet } from '@/types'

export function useBets(planillaId: string | undefined) {
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [loading, setLoading] = useState(!!planillaId)

  const load = useCallback(async () => {
    if (!planillaId) return
    setLoading(true)
    try {
      const res = await api.get(`/bets/planillas/${planillaId}/bets?t=${Date.now()}`)
      const map: Record<string, Bet> = {}
      for (const b of res.data.data) map[b.match_id] = b
      setBets(map)
    } catch { /* caller handles empty state */ }
    finally { setLoading(false) }
  }, [planillaId])

  useEffect(() => { load() }, [load])

  return { bets, setBets, loading, refetch: load }
}
