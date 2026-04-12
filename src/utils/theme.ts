import { TEAM_THEMES } from '@/types'

export function applyTheme(tema: string) {
  const resolved = TEAM_THEMES[tema] ? tema : 'neutral'
  document.documentElement.setAttribute('data-theme', resolved)
}
