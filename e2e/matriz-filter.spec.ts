/**
 * E2E: Filtros multi-select en la Matriz
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
test.use({ storageState: AUTH_FILE })

test.beforeEach(async ({ page }) => {
  await page.goto('/matriz')
  // Esperar a que cargue la tabla
  await page.waitForSelector('table, [data-testid="matriz-table"], .overflow-x-auto', { timeout: 15_000 })
})

test('los pills de leyenda son visibles', async ({ page }) => {
  // Los 5 colores deben aparecer como botones
  for (const label of ['4pts', '3pts', '2pts', '1pt', 'sin acierto']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
})

test('clicar un pill lo activa (ring visible)', async ({ page }) => {
  const pill = page.getByRole('button', { name: '3pts' })
  await pill.click()
  // Después del click el pill debe tener la clase de anillo activo
  await expect(pill).toHaveClass(/ring-2/)
})

test('clicar dos pills los activa a ambos (multi-select)', async ({ page }) => {
  const pill3 = page.getByRole('button', { name: '3pts' })
  const pill4 = page.getByRole('button', { name: '4pts' })

  await pill3.click()
  await pill4.click()

  await expect(pill3).toHaveClass(/ring-2/)
  await expect(pill4).toHaveClass(/ring-2/)
})

test('clicar el mismo pill dos veces lo desactiva', async ({ page }) => {
  const pill = page.getByRole('button', { name: '3pts' })

  await pill.click()
  await expect(pill).toHaveClass(/ring-2/)

  await pill.click()
  await expect(pill).not.toHaveClass(/ring-2/)
})

test('con filtro activo aparece el botón "limpiar"', async ({ page }) => {
  await page.getByRole('button', { name: '3pts' }).click()
  await expect(page.getByRole('button', { name: /limpiar/i })).toBeVisible()
})

test('el botón limpiar quita todos los filtros activos', async ({ page }) => {
  const pill3 = page.getByRole('button', { name: '3pts' })
  const pill4 = page.getByRole('button', { name: '4pts' })

  await pill3.click()
  await pill4.click()

  await page.getByRole('button', { name: /limpiar/i }).click()

  await expect(pill3).not.toHaveClass(/ring-2/)
  await expect(pill4).not.toHaveClass(/ring-2/)
  await expect(page.getByRole('button', { name: /limpiar/i })).toHaveCount(0)
})
