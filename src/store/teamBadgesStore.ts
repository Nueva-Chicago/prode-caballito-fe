import { create } from 'zustand'
import { api } from '@/api/client'

interface TeamBadgesStore {
  badges: Record<string, string>  // team_name (uppercase) → url
  loaded: boolean
  load: () => Promise<void>
  setBadge: (teamName: string, url: string) => void
  removeBadge: (teamName: string) => void
}

export const useTeamBadgesStore = create<TeamBadgesStore>((set, get) => ({
  badges: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return
    try {
      const { data } = await api.get('/teams/badges')
      const normalized: Record<string, string> = {}
      Object.entries(data.data || {}).forEach(([k, v]) => {
        normalized[k.toUpperCase().trim()] = v as string
      })
      set({ badges: normalized, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  setBadge: (teamName, url) => set(s => ({
    badges: { ...s.badges, [teamName.toUpperCase().trim()]: url }
  })),

  removeBadge: (teamName) => set(s => {
    const b = { ...s.badges }
    delete b[teamName.toUpperCase().trim()]
    return { badges: b }
  }),
}))

/** Retorna la URL del escudo si existe, o null */
export function getTeamBadge(name: string, badges: Record<string, string>): string | null {
  return badges[name.toUpperCase().trim()] ?? null
}
