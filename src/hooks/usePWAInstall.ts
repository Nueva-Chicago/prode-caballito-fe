import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Detecta iOS Safari
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

// Detecta si ya está instalada como PWA
function isInStandaloneMode() {
  return ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
}

export type InstallState =
  | { type: 'prompt' }        // Chrome/Edge/Android: puede instalarse con 1 click
  | { type: 'ios' }           // iOS Safari: instrucciones manuales
  | { type: 'installed' }     // Ya está instalada
  | { type: 'unavailable' }   // Otro browser sin soporte

export function usePWAInstall() {
  const [state, setState] = useState<InstallState>({ type: 'unavailable' })
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInStandaloneMode()) {
      setState({ type: 'installed' })
      return
    }

    if (isIOS()) {
      setState({ type: 'ios' })
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState({ type: 'prompt' })
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setState({ type: 'installed' }))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setState({ type: 'installed' })
    setDeferredPrompt(null)
  }

  return { state, install }
}
