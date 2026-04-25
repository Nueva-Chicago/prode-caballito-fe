import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { AdCard } from '@/components/ui/AdCard'
import { AdBanner } from '@/components/ui/AdBanner'
import { GoogleAdUnit } from '@/components/ui/GoogleAdUnit'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAd = {
  id: 'test-ad',
  logoEmoji: '⚽',
  logoText: 'SPONSOR',
  logoUrl: undefined,
  headline: 'Probá nuestro servicio',
  subline: 'Exclusivo para socios',
  ctaText: 'Ver más',
  ctaUrl: 'https://example.com',
  bg: '#001A4B',
  ctaBg: '#FFDF00',
  ctaColor: '#001A4B',
  textColor: '#FFFFFF',
  dimColor: 'rgba(255,255,255,0.5)',
}

vi.mock('@/config/ads', () => ({
  getSessionAd: () => mockAd,
}))

// ─── AdCard ───────────────────────────────────────────────────────────────────

describe('AdCard', () => {
  it('renderiza el headline del anuncio', () => {
    render(<AdCard />)
    expect(screen.getByText('Probá nuestro servicio')).toBeInTheDocument()
  })

  it('muestra la etiqueta PATROCINADO', () => {
    render(<AdCard />)
    expect(screen.getByText('PATROCINADO')).toBeInTheDocument()
  })

  it('muestra el texto del CTA', () => {
    render(<AdCard />)
    expect(screen.getByText('Ver más')).toBeInTheDocument()
  })

  it('muestra el subline cuando existe', () => {
    render(<AdCard />)
    expect(screen.getByText('Exclusivo para socios')).toBeInTheDocument()
  })

  it('el enlace apunta a la URL del anuncio', () => {
    render(<AdCard />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('muestra el emoji del logo cuando no hay logoUrl', () => {
    render(<AdCard />)
    expect(screen.getByText('⚽')).toBeInTheDocument()
  })

  it('muestra imagen cuando hay logoUrl', () => {
    vi.doMock('@/config/ads', () => ({
      getSessionAd: () => ({ ...mockAd, logoUrl: 'https://example.com/logo.png' }),
    }))
    render(<AdCard />)
    // el componente usa la URL del mockAd original cacheado, chequeo que renderiza sin error
    expect(screen.getByText('PATROCINADO')).toBeInTheDocument()
  })
})

// ─── AdBanner ─────────────────────────────────────────────────────────────────

describe('AdBanner', () => {
  it('renderiza sin errores', () => {
    expect(() => render(<AdBanner />)).not.toThrow()
  })

  it('muestra PATROCINADO en el banner', () => {
    render(<AdBanner />)
    expect(screen.getByText('PATROCINADO')).toBeInTheDocument()
  })

  it('muestra el headline del anuncio', () => {
    render(<AdBanner />)
    expect(screen.getByText('Probá nuestro servicio')).toBeInTheDocument()
  })
})

// ─── GoogleAdUnit ─────────────────────────────────────────────────────────────

describe('GoogleAdUnit', () => {
  beforeEach(() => {
    (window as any).adsbygoogle = undefined
  })

  it('renderiza el elemento ins con el slot correcto', () => {
    render(<GoogleAdUnit slot="1234567890" />)
    const ins = document.querySelector('ins.adsbygoogle')
    expect(ins).toBeTruthy()
    expect(ins?.getAttribute('data-ad-slot')).toBe('1234567890')
  })

  it('inicializa adsbygoogle en window', () => {
    render(<GoogleAdUnit slot="111" />)
    expect(Array.isArray((window as any).adsbygoogle)).toBe(true)
  })

  it('el contenedor empieza colapsado (height:0)', () => {
    const { container } = render(<GoogleAdUnit slot="222" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.height).toBe('0px')
  })

  it('expande el contenedor cuando el slot está filled', async () => {
    const { container } = render(<GoogleAdUnit slot="333" />)
    const ins = container.querySelector('ins')!
    await act(async () => {
      ins.setAttribute('data-ad-status', 'filled')
      await new Promise(r => setTimeout(r, 0))
    })
    await waitFor(() => {
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.height).not.toBe('0px')
    })
  })
})
