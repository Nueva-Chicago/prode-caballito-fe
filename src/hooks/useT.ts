import { useAuthStore } from '@/store/authStore'
import { es } from '@/i18n/es'
import { pt } from '@/i18n/pt'

export function useT() {
  const lang = useAuthStore(s => s.user?.idioma_pref)
  return lang === 'pt' ? pt : es
}
