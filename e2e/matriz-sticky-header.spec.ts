/**
 * E2E: Header sticky de la Matriz
 *
 * Verifica que la fila de encabezado (jugador / pts / partidos) permanezca
 * visible al hacer scroll hacia abajo en la tabla.
 *
 * La regresión que previene: cuando el contenedor de la tabla tenía
 * overflow-x-auto + overflow-y-auto simultáneos, iOS Safari (y algunos
 * navegadores Chromium) ignoraban position:sticky en los <th>, haciendo que
 * el header desapareciera al scrollear.
 * Fix: quitar overflow-y-auto del contenedor y usar sticky top-14
 * (debajo del navbar de 56 px) para que el sticky funcione contra el viewport.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
test.use({ storageState: AUTH_FILE })

test.beforeEach(async ({ page }) => {
  await page.goto('/matriz')
  await page.waitForSelector('table thead th', { timeout: 15_000 })
})

test('el header de la tabla está en un contenedor sin overflow-y-auto', async ({ page }) => {
  // El contenedor directo de la tabla NO debe tener overflow-y-auto ni max-h
  // (eso rompería sticky en iOS Safari)
  const container = page.locator('table').locator('..')

  const overflowY = await container.evaluate(el => getComputedStyle(el).overflowY)
  expect(overflowY).not.toBe('auto')
  expect(overflowY).not.toBe('scroll')
})

test('los <th> de la primera fila tienen position sticky', async ({ page }) => {
  const firstTh = page.locator('table thead tr th').first()
  const position = await firstTh.evaluate(el => getComputedStyle(el).position)
  expect(position).toBe('sticky')
})

test('el header permanece visible después de hacer scroll hacia abajo', async ({ page }) => {
  // Hacer scroll al fondo de la página
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(300)

  // El primer <th> (columna Jugador) debe seguir en el viewport
  const firstTh = page.locator('table thead tr th').first()
  await expect(firstTh).toBeInViewport()
})

test('el <th> de la esquina (jugador + sticky left) combina sticky vertical y horizontal', async ({ page }) => {
  const cornerTh = page.locator('table thead tr th').first()

  const [position, top, left] = await cornerTh.evaluate(el => {
    const s = getComputedStyle(el)
    return [s.position, s.top, s.left]
  })

  expect(position).toBe('sticky')
  // top debe ser 56px (top-14 = 3.5rem = 56px) o similar, no 0px
  const topPx = parseFloat(top)
  expect(topPx).toBeGreaterThan(0)
  // left debe ser 0px (pegado al borde izquierdo)
  expect(parseFloat(left)).toBe(0)
})
