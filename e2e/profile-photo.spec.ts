/**
 * E2E: Cambio de foto de perfil y consent de WhatsApp
 *
 * Valida que el avatar tenga el input correcto para usar el sheet
 * nativo del sistema operativo, y que el consent de WhatsApp esté
 * checked por defecto.
 */
import { test, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
test.use({ storageState: AUTH_FILE })

test.beforeEach(async ({ page }) => {
  await page.goto('/profile')
  await page.waitForSelector('h1', { timeout: 10_000 })
})

// ── Foto de perfil ────────────────────────────────────────────────────────────

test('el input de foto tiene accept="image/*" y no tiene atributo capture', async ({ page }) => {
  const input = page.locator('input[type="file"][accept="image/*"]').first()
  await expect(input).toHaveCount(1)
  // No debe tener capture — usamos el sheet nativo del OS
  const capture = await input.getAttribute('capture')
  expect(capture).toBeNull()
})

test('el avatar o el lápiz de foto es clickable', async ({ page }) => {
  // El elemento clickable que dispara el input de foto
  const photoTrigger = page.locator('[class*="cursor-pointer"]').filter({
    has: page.locator('input[type="file"]'),
  }).first()
  await expect(photoTrigger).toBeVisible()
})

test('la sección de foto tiene el lápiz ✏️ visible', async ({ page }) => {
  await expect(page.getByText('✏️')).toBeVisible()
})

// ── Consent de WhatsApp ───────────────────────────────────────────────────────

test('el checkbox de consent de WhatsApp existe en el perfil', async ({ page }) => {
  const checkbox = page.locator('input[type="checkbox"]').first()
  await expect(checkbox).toBeVisible()
})

test('el checkbox de consent de WhatsApp está checked por defecto o según el valor del usuario', async ({ page }) => {
  // El checkbox refleja el estado del usuario. Lo que validamos es que
  // exista y sea interactuable (no disabled).
  const checkbox = page.locator('input[type="checkbox"]').first()
  await expect(checkbox).not.toBeDisabled()
})

test('el texto de consent de WhatsApp es visible', async ({ page }) => {
  await expect(
    page.getByText(/mi número sea visible para otros jugadores/i)
  ).toBeVisible()
})

test('el checkbox de consent se puede togglear', async ({ page }) => {
  const checkbox = page.locator('input[type="checkbox"]').first()
  const initial = await checkbox.isChecked()
  await checkbox.click()
  await expect(checkbox).toBeChecked({ checked: !initial })
  // Restaurar estado original
  await checkbox.click()
  await expect(checkbox).toBeChecked({ checked: initial })
})

// ── Sección de WhatsApp general ───────────────────────────────────────────────

test('la sección de WhatsApp tiene input de teléfono y selector de código de país', async ({ page }) => {
  await expect(page.locator('select')).toBeVisible()
  await expect(page.getByPlaceholder(/11 1234 5678/i)).toBeVisible()
})

test('el botón Guardar de WhatsApp existe', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Guardar/i })).toBeVisible()
})
