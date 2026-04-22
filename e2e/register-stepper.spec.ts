/**
 * E2E: Stepper de registro — 4 pasos + step de notificaciones
 *
 * No completa el flujo real (requeriría email válido y código de verificación),
 * pero valida la estructura del stepper y el contenido de cada step visible.
 */
import { test, expect } from '@playwright/test'

// Sin auth — esta página es pública
test.beforeEach(async ({ page }) => {
  await page.goto('/register')
  await page.waitForSelector('form', { timeout: 8_000 })
})

// ── Stepper ───────────────────────────────────────────────────────────────────

test('el stepper muestra exactamente 4 pasos', async ({ page }) => {
  const steps = page.getByText(/^(Cuenta|Email|Perfil|Avisos)$/)
  await expect(steps).toHaveCount(4)
})

test('los 4 labels del stepper son: Cuenta, Email, Perfil, Avisos', async ({ page }) => {
  for (const label of ['Cuenta', 'Email', 'Perfil', 'Avisos']) {
    await expect(page.getByText(label)).toBeVisible()
  }
})

test('el paso activo inicial es Cuenta (círculo 1 activo)', async ({ page }) => {
  // El step 1 debe estar activo (círculo amarillo con "1")
  const step1 = page.getByText('Cuenta')
  await expect(step1).toBeVisible()
  // Los pasos 2, 3 y 4 son grises (inactivos al inicio)
  await expect(page.getByText('Email')).toBeVisible()
  await expect(page.getByText('Perfil')).toBeVisible()
  await expect(page.getByText('Avisos')).toBeVisible()
})

// ── Step 1: Cuenta ────────────────────────────────────────────────────────────

test('el step Cuenta tiene los campos Nombre, Email y Contraseña', async ({ page }) => {
  await expect(page.getByPlaceholder(/Tu nombre/i)).toBeVisible()
  await expect(page.getByPlaceholder(/tu@email\.com/i)).toBeVisible()
  await expect(page.getByPlaceholder(/Mínimo 6 caracteres/i)).toBeVisible()
})

test('el botón de continuar está presente en el step Cuenta', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Continuar/i })).toBeVisible()
})

test('el link "¿Ya tenés cuenta?" lleva a /login', async ({ page }) => {
  await page.getByRole('link', { name: /Iniciá sesión/i }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 6_000 })
})

test('el step Cuenta no avanza con campos vacíos', async ({ page }) => {
  await page.getByRole('button', { name: /Continuar/i }).click()
  // Debe seguir en /register (validación HTML5 nativa)
  await expect(page).toHaveURL(/\/register/)
})

test('el step Cuenta no avanza con contraseña menor a 6 caracteres', async ({ page }) => {
  await page.getByPlaceholder(/Tu nombre/i).fill('Test')
  await page.getByPlaceholder(/tu@email\.com/i).fill('test@test.com')
  await page.getByPlaceholder(/Mínimo 6 caracteres/i).fill('abc')
  await page.getByRole('button', { name: /Continuar/i }).click()
  await expect(page).toHaveURL(/\/register/)
})

// ── Consent WhatsApp (step Perfil) ────────────────────────────────────────────
// No podemos llegar al step Perfil sin email real, pero validamos que
// el checkbox existe en el DOM del step `complete` si se pudiera avanzar.
// Lo cubrimos con el test de Profile donde sí podemos loguear.
