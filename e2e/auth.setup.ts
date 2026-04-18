/**
 * Shared login helper — saves auth state to file so other tests don't re-login.
 * Run with: npx playwright test --project=setup (automatically used by dependsOn)
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

export const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('authenticate', async ({ page }) => {
  const email    = process.env.E2E_EMAIL    ?? 'cfdelrio@gmail.com'
  const password = process.env.E2E_PASSWORD ?? 'qatar2022'

  await page.goto('/login')
  await page.getByPlaceholder(/email/i).fill(email)
  await page.getByPlaceholder(/contraseña|password/i).fill(password)
  await page.getByRole('button', { name: /ingresar|entrar|login/i }).click()

  // Wait until we land on home (not login)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

  // Persist auth storage (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE })
})
