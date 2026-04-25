import { describe, it, expect } from 'vitest'
import { es } from '@/i18n/es'
import { pt } from '@/i18n/pt'

// Ejercita todas las funciones de es.ts y pt.ts para maximizar coverage

describe('es.ts — funciones dinámicas', () => {
  it('home: greeting, contextPodium, contextPending, contextDefault', () => {
    expect(es.home.greeting('Carlos')).toContain('Carlos')
    expect(es.home.contextPodium(2)).toContain('2')
    expect(es.home.contextPending(1)).toContain('1')
    expect(es.home.contextPending(3)).toContain('3')
    expect(es.home.contextDefault(5)).toContain('5')
    expect(es.home.pending(1)).toContain('1')
    expect(es.home.pending(3)).toContain('3')
    expect(es.home.fromFirst(7)).toContain('7')
    expect(es.home.ctaTitle(1)).toContain('1')
    expect(es.home.ctaTitle(4)).toContain('4')
    expect(es.home.ctaUrgent(1)).toContain('1')
    expect(es.home.ctaUrgent(2)).toContain('2')
  })

  it('match: reminderOption, reminderSet', () => {
    expect(es.match.reminderOption(30)).toContain('30')
    expect(es.match.reminderSet(15)).toContain('15')
  })

  it('bets: noBeetsTitle, planillaCreated, missingBets', () => {
    expect(es.bets.noBeetsTitle('Liga')).toContain('Liga')
    expect(es.bets.planillaCreated('Mi equipo')).toContain('Mi equipo')
    expect(es.bets.missingBets(1)).toMatch(/pronóstico/)
    expect(es.bets.missingBets(3)).toMatch(/pronósticos/)
  })

  it('ranking: shareText, shareMyText (líder y no líder)', () => {
    expect(es.ranking.shareText('Ana', 2, 30)).toContain('Ana')
    expect(es.ranking.shareMyText(1, 50)).toContain('líder')
    expect(es.ranking.shareMyText(3, 25)).toContain('#3')
  })

  it('profile: themeActivated', () => {
    expect(es.profile.themeActivated('Argentina')).toContain('Argentina')
  })

  it('tournaments: stats', () => {
    expect(es.tournaments.stats(10, 4)).toContain('10')
    expect(es.tournaments.stats(10, 4)).toContain('4')
  })

  it('viral: exact (0, 1, n), topPred, shareText', () => {
    expect(es.viral.exact(0, 20)).toMatch(/Nadie/)
    expect(es.viral.exact(1, 20)).toMatch(/Solo 1/)
    expect(es.viral.exact(5, 20)).toMatch(/5/)
    expect(es.viral.topPred('2-1', 8)).toContain('2-1')
    const txt = es.viral.shareText('ARG', 'BRA', 2, 0, 3, 20)
    expect(txt).toContain('ARG')
    expect(txt).toContain('3')
    const txt0 = es.viral.shareText('ARG', 'BRA', 0, 0, 0, 10)
    expect(txt0).toMatch(/Nadie/)
    const txt1 = es.viral.shareText('ARG', 'BRA', 1, 0, 1, 10)
    expect(txt1).toMatch(/Solo/)
  })
})

describe('pt.ts — satisface el tipo T y funciones dinámicas', () => {
  it('home: greeting, contextPodium, contextPending, contextDefault', () => {
    expect(pt.home.greeting('João')).toContain('João')
    expect(pt.home.contextPodium(3)).toContain('3')
    expect(pt.home.contextPending(1)).toBeTruthy()
    expect(pt.home.contextPending(2)).toBeTruthy()
    expect(pt.home.contextDefault(4)).toContain('4')
    expect(pt.home.pending(1)).toBeTruthy()
    expect(pt.home.pending(5)).toBeTruthy()
    expect(pt.home.fromFirst(10)).toContain('10')
    expect(pt.home.ctaTitle(1)).toBeTruthy()
    expect(pt.home.ctaTitle(3)).toBeTruthy()
    expect(pt.home.ctaUrgent(1)).toBeTruthy()
    expect(pt.home.ctaUrgent(4)).toBeTruthy()
  })

  it('match: reminderOption, reminderSet', () => {
    expect(pt.match.reminderOption(60)).toContain('60')
    expect(pt.match.reminderSet(45)).toContain('45')
  })

  it('bets: noBeetsTitle, planillaCreated, missingBets', () => {
    expect(pt.bets.noBeetsTitle('Copa')).toContain('Copa')
    expect(pt.bets.planillaCreated('Meu time')).toContain('Meu time')
    expect(pt.bets.missingBets(1)).toBeTruthy()
    expect(pt.bets.missingBets(2)).toBeTruthy()
  })

  it('ranking: shareText, shareMyText (líder y no líder)', () => {
    expect(pt.ranking.shareText('Ana', 1, 40)).toContain('Ana')
    expect(pt.ranking.shareMyText(1, 60)).toContain('líder')
    expect(pt.ranking.shareMyText(2, 30)).toContain('#2')
  })

  it('profile: themeActivated', () => {
    expect(pt.profile.themeActivated('Brasil')).toContain('Brasil')
  })

  it('tournaments: stats', () => {
    expect(pt.tournaments.stats(8, 3)).toContain('8')
  })

  it('viral: exact (0, 1, n), topPred, shareText', () => {
    expect(pt.viral.exact(0, 15)).toBeTruthy()
    expect(pt.viral.exact(1, 15)).toBeTruthy()
    expect(pt.viral.exact(4, 15)).toContain('4')
    expect(pt.viral.topPred('1-0', 5)).toContain('1-0')
    const txt = pt.viral.shareText('BRA', 'ARG', 3, 1, 2, 12)
    expect(txt).toContain('BRA')
    const txt0 = pt.viral.shareText('BRA', 'ARG', 0, 0, 0, 10)
    expect(txt0).toBeTruthy()
    const txt1 = pt.viral.shareText('BRA', 'ARG', 1, 0, 1, 10)
    expect(txt1).toBeTruthy()
  })

  it('traduce cadenas estáticas clave', () => {
    expect(pt.nav.home).toBeTruthy()
    expect(pt.bets.title).toBeTruthy()
    expect(pt.ranking.title).toBeTruthy()
    expect(pt.messages.title).toBeTruthy()
    expect(pt.planilla.notFound).toBeTruthy()
    expect(pt.fixture.title).toBeTruthy()
    expect(pt.matrix.title).toBeTruthy()
  })
})
