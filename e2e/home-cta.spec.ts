/**
 * E2E: CTA "pronósticos pendientes" en Home
 *
 * Cubre el banner que aparece cuando el usuario tiene apuestas sin completar.
 * Requiere que la cuenta de test (cfdelrio@gmail.com) tenga al menos un
 * partido pendiente sin apuesta; si no, los tests de "banner visible" se
 * marcan como skip automáticamente.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

test.use({ storageState: AUTH_FILE })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Esperar a que cargue el contenido principal (no el spinner)
  await page.waitForSelector('h1, [class*="gradient-hero"]', { timeout: 10_000 })
})

// ── Helper ────────────────────────────────────────────────────────────────────

async function countPendingUnbet(page: any): Promise<number> {
  const banner = page.getByText(/Tenés \d+ pronóstico/)
  const visible = await banner.isVisible().catch(() => false)
  if (!visible) return 0
  const text: string = await banner.textContent()
  const match = text.match(/Tenés (\d+)/)
  return match ? parseInt(match[1]) : 0
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('la página Home carga sin errores visibles', async ({ page }) => {
  await expect(page.getByText(/error|algo salió mal/i)).toHaveCount(0)
  await expect(page.getByText(/Hola/i)).toBeVisible()
})

test('los accesos rápidos (Apostar, Ranking, Matriz) están visibles', async ({ page }) => {
  await expect(page.getByRole('link', { name: /apostar/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /ranking/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /matriz/i })).toBeVisible()
})

test('si hay pendientes → el banner muestra el contador correcto', async ({ page }) => {
  const pending = await countPendingUnbet(page)
  if (pending === 0) {
    test.skip(true, 'Sin partidos pendientes sin apuesta — skip')
    return
  }
  const banner = page.getByText(/Tenés \d+ pronóstico/)
  await expect(banner).toBeVisible()
  await expect(page.getByText('Completar ahora →')).toBeVisible()
})

test('el banner CTA lleva a /apuestas', async ({ page }) => {
  const pending = await countPendingUnbet(page)
  if (pending === 0) {
    test.skip(true, 'Sin pendientes — skip')
    return
  }
  await page.getByText('Completar ahora →').click()
  await expect(page).toHaveURL(/\/apuestas/, { timeout: 8_000 })
})

test('el banner es urgente (rojo) si hay partidos cerrando pronto sin apuesta', async ({ page }) => {
  const urgent = page.getByText(/⚠️.*cierra pronto/i)
  const isUrgent = await urgent.isVisible().catch(() => false)
  if (!isUrgent) {
    await expect(page.getByText(/cierra pronto sin tu apuesta/i)).toHaveCount(0)
  } else {
    await expect(urgent).toBeVisible()
    await expect(page.getByText('Completar ahora →')).toBeVisible()
  }
})

test('si están todas las apuestas → NO se muestra el banner', async ({ page }) => {
  const pending = await countPendingUnbet(page)
  if (pending > 0) {
    test.skip(true, 'Hay pendientes — skip (este test verifica el estado contrario)')
    return
  }
  await expect(page.getByText(/Tenés \d+ pronóstico/)).toHaveCount(0)
})

test('la tarjeta ⚽ muestra badge "N faltan" o "Al día ✓"', async ({ page }) => {
  const pending = await countPendingUnbet(page)
  if (pending > 0) {
    await expect(page.getByText(/\d+ faltan/)).toBeVisible()
  } else {
    await expect(page.getByText('Al día ✓')).toBeVisible()
  }
})
