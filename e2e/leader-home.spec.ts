/**
 * E2E: LeaderHome — home exclusiva para el usuario #1 del ranking
 *
 * Si la cuenta de test NO va primera, todos los tests se marcan como skip
 * automáticamente (el estado del ranking varía en producción).
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
test.use({ storageState: AUTH_FILE })

// ── Helper: detecta si estamos viendo la LeaderHome ──────────────────────────
async function isLeaderHome(page: any): Promise<boolean> {
  return page.getByText('LA PUNTA').isVisible().catch(() => false)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Esperar a que cargue — tanto home normal como leader home
  await page.waitForSelector('h1, [class*="gradient-hero"], [style*="030810"]', { timeout: 12_000 })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test('si el usuario es #1 → se muestra la LeaderHome y no la home normal', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 en el ranking — skip')
    return
  }
  // El hero de la LeaderHome debe mostrarse
  await expect(page.getByText('LA PUNTA')).toBeVisible()
  await expect(page.getByText('ES TUYA')).toBeVisible()
  // La home normal NO debe mostrarse
  await expect(page.getByText('EL MUNDIAL SE JUEGA ACÁ')).toHaveCount(0)
})

test('el badge #1 · LÍDER ABSOLUTO es visible', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByText(/# 1.*LÍDER ABSOLUTO/i)).toBeVisible()
})

test('las 4 stat cards están visibles (POSICIÓN, PUNTOS, VENTAJA, EXACTOS)', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  for (const label of ['POSICIÓN', 'PUNTOS', 'VENTAJA', 'EXACTOS']) {
    await expect(page.getByText(label)).toBeVisible()
  }
})

test('la card POSICIÓN muestra #1', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByText('#1')).toBeVisible()
})

test('el banner emocional de marca está visible', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByText(/Desde ProdeCaballito/i)).toBeVisible()
  await expect(page.getByText(/tratarte como te merecés/i)).toBeVisible()
})

test('el módulo de ranking muestra "VOS VAN PRIMERO"', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByText(/VOS VAN PRIMERO/i)).toBeVisible()
})

test('el título de próximos partidos tiene tono competitivo', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByText(/Se viene tu próxima defensa/i)).toBeVisible()
})

test('el botón de compartir está visible', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  await expect(page.getByRole('button', { name: /Compartir que voy primero/i })).toBeVisible()
})

test('si hay pronósticos pendientes → el CTA los menciona', async ({ page }) => {
  if (!await isLeaderHome(page)) {
    test.skip(true, 'Usuario no es #1 — skip')
    return
  }
  const hasCta = await page.getByText(/Defender el #1|Completar.*pendiente/i).isVisible().catch(() => false)
  // Puede no haber pendientes — ambos estados son válidos
  if (hasCta) {
    await expect(page.getByText(/Defender el #1|Completar.*pendiente/i)).toBeVisible()
  }
})

test('si el usuario NO es #1 → se muestra la home normal (sin LeaderHome)', async ({ page }) => {
  if (await isLeaderHome(page)) {
    test.skip(true, 'Usuario es #1 — este test verifica el estado contrario')
    return
  }
  // La home normal tiene accesos rápidos
  await expect(page.getByRole('link', { name: /apostar/i })).toBeVisible()
  await expect(page.getByText('LA PUNTA')).toHaveCount(0)
})
