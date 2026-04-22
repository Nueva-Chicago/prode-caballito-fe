import { TEAM_THEMES } from '@/types'

// ─── WCAG Contrast Engine ─────────────────────────────────────────────────────
//
// Design token contract:
//   team defines:  primary, secondary
//   system derives: --theme-on-primary, --theme-on-secondary
//
// Rule: text color on any role background must satisfy WCAG AA (4.5:1 for
// normal text, 3:1 for large text / UI components). We target 4.5:1 minimum.

function hexToLinear(channel: number): number {
  const s = channel / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = hexToLinear(parseInt(h.slice(0, 2), 16))
  const g = hexToLinear(parseInt(h.slice(2, 4), 16))
  const b = hexToLinear(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Returns #FFFFFF or #1A1A1A — whichever passes WCAG AA against `bg`.
 * If neither reaches 4.5:1 (very saturated mid-tone), picks the better one.
 */
export function textOnBg(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#1A1A1A')
    ? '#FFFFFF'
    : '#1A1A1A'
}

// ─── Theme application ────────────────────────────────────────────────────────

export function applyTheme(tema: string) {
  const resolved = TEAM_THEMES[tema] ? tema : 'neutral'
  const theme = TEAM_THEMES[resolved]
  const root = document.documentElement

  // 1. Set data-theme so CSS cascade picks up nav-bg, primary, secondary, page vars
  root.setAttribute('data-theme', resolved)

  // 2. Auto-compute contrast-safe text colors.
  //    Inline style props have higher specificity than CSS rules — they win.
  //    This is intentional: the CSS fallbacks in index.css exist only for
  //    SSR / before JS runs. The JS values are authoritative.
  root.style.setProperty('--theme-on-primary', textOnBg(theme.primary))
  root.style.setProperty('--theme-on-secondary', textOnBg(theme.secondary))
}
