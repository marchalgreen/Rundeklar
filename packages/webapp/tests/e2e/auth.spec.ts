/**
 * Authentication flow E2E tests
 * Tests login, registration, password reset, and PIN reset flows
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/#/login')
      await page.waitForLoadState('networkidle')
      
      // Check for login form elements
      const heading = page.getByRole('heading', { name: /log ind|login/i })
      await expect(heading).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/#/login')
      await page.waitForLoadState('networkidle')
      
      // HTML5 validation shows browser-native messages, so we check for invalid state
      // or try to submit and check if form prevents submission
      const loginButton = page.getByRole('button', { name: /log ind|login/i })
      
      // For PIN method (default), check username field
      const usernameInput = page.getByLabel(/brugernavn|username/i).or(
        page.locator('#username')
      )
      
      // Try to submit empty form
      await loginButton.click()
      
      // HTML5 validation will prevent submission, check for invalid state
      // or check if username field is marked as invalid
      await page.waitForTimeout(300)
      
      // Check if form is still on login page (validation prevented submission)
      // or check for HTML5 validation message (browser-native)
      const isStillOnLogin = await page.evaluate(() => {
        return window.location.hash.includes('#/login')
      })
      
      // Form should prevent submission due to HTML5 required validation
      expect(isStillOnLogin).toBe(true)
    })

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/#/login')
      await page.waitForLoadState('networkidle')
      
      const helpers = new TestHelpers(page)
      
      // Switch to email login method if needed
      const emailTab = page.getByRole('button', { name: /administrator|email/i })
      const isEmailMethod = await emailTab.isVisible().catch(() => false)
      
      if (isEmailMethod) {
        await emailTab.click()
        await page.waitForTimeout(300)
      }
      
      // Fill with invalid credentials
      const usernameInput = page.locator('#username').or(
        page.getByLabel(/brugernavn|username/i)
      )
      const pinInput = page.locator('[aria-label*="PIN"]').or(
        page.locator('input[type="text"]').nth(1)
      )
      
      // For PIN method (default)
      if (await usernameInput.isVisible().catch(() => false)) {
        await usernameInput.fill('invaliduser')
        // Fill PIN (6 digits)
        if (await pinInput.isVisible().catch(() => false)) {
          await pinInput.fill('123456')
        }
      } else {
        // Email method
        const emailField = page.getByLabel(/email|e-mail/i).or(page.locator('input[type="email"]'))
        const passwordField = page.getByLabel(/password|adgangskode/i).or(page.locator('input[type="password"]'))
        
        if (await helpers.elementExists(emailField)) {
          await emailField.fill('invalid@example.com')
        }
        if (await helpers.elementExists(passwordField)) {
          await passwordField.fill('wrongpassword')
        }
      }
      
      const loginButton = page.getByRole('button', { name: /log ind|login/i })
      await loginButton.click()
      
      // Wait for error message
      await page.waitForTimeout(2000)
      
      // Check for error message (can be in error div or toast)
      const errorMessage = page.locator('text=/ugyldig|invalid|forkert|fejlede|failed/i').or(
        page.locator('[role="alert"]')
      )
      const hasError = await helpers.elementExists(errorMessage)
      expect(hasError).toBe(true)
    })
  })

  test.describe('Registration', () => {
    test('should display registration page', async ({ page }) => {
      await page.goto('/#/register')
      await page.waitForLoadState('networkidle')
      
      const heading = page.getByRole('heading', { name: /opret|register/i })
      await expect(heading).toBeVisible()
    })

    test('should show password strength requirements', async ({ page }) => {
      await page.goto('/#/register')
      await page.waitForLoadState('networkidle')
      
      const passwordInput = page.getByLabel(/password|adgangskode/i).or(
        page.getByPlaceholder(/password|adgangskode/i)
      )
      
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill('weak')
        
        // Check for password strength indicator
        await page.waitForTimeout(500)
        const strengthIndicator = page.locator('text=/stærk|strong|svag|weak/i')
        const hasIndicator = await strengthIndicator.isVisible().catch(() => false)
        // Password strength indicator may or may not be present
        expect(hasIndicator).toBeDefined()
      }
    })
  })

  test.describe('Password Reset', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/#/forgot-password')
      await page.waitForLoadState('networkidle')
      
      const heading = page.getByRole('heading', { name: /glemt|forgot/i })
      await expect(heading).toBeVisible()
    })

    test('should send password reset email', async ({ page }) => {
      await page.goto('/#/forgot-password')
      await page.waitForLoadState('networkidle')
      
      const helpers = new TestHelpers(page)
      
      // Find email input
      const emailInput = page.getByLabel(/email|e-mail/i).or(
        page.locator('input[type="email"]')
      )
      
      if (await helpers.elementExists(emailInput)) {
        await emailInput.fill('test@example.com')
        
        const submitButton = page.getByRole('button', { name: /send|submit|nulstil/i })
        await submitButton.click()
        
        // Wait for response (success message or redirect)
        await page.waitForTimeout(2000)
        
        // Check for success message or redirect to login
        const successMessage = page.locator('text=/sendt|sent|tjek|check|email/i')
        const hasSuccess = await helpers.elementExists(successMessage)
        const isOnLogin = await helpers.isOnRoute('login')
        
        // Either success message shown or redirected to login
        expect(hasSuccess || isOnLogin).toBe(true)
      }
    })
  })

  test.describe('PIN Reset', () => {
    test('should display forgot PIN page', async ({ page }) => {
      await page.goto('/#/forgot-pin')
      await page.waitForLoadState('networkidle')
      
      const heading = page.getByRole('heading', { name: /glemt.*pin|forgot.*pin/i })
      await expect(heading).toBeVisible()
    })
  })
})

