import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import type { Planilla } from '@/types'

export function usePlanilla(planillaId: string | undefined) {
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!planillaId) return
    try {
      const res = await api.get(`/planillas/${planillaId}`)
      setPlanilla(res.data.data)
    } catch { /* caller handles empty state */ }
    finally { setLoading(false) }
  }, [planillaId])

  useEffect(() => { load() }, [load])

  return { planilla, loading, refetch: load }
}
