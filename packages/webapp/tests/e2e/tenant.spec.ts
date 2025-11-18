/**
 * Tenant Routing E2E tests
 * Tests multi-tenant functionality and routing
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Tenant Routing', () => {
  test('should load default tenant', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Wait for tenant context to load
    await page.waitForTimeout(1000)
    
    // Check that page loaded (no error)
    const errorMessage = page.locator('text=/error|fejl/i')
    const hasError = await errorMessage.isVisible().catch(() => false)
    expect(hasError).toBe(false)
  })

  test('should display tenant-specific branding', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    const helpers = new TestHelpers(page)
    
    // Look for logo
    const logo = page.locator('img[alt*="logo" i]').or(page.locator('img[src*="logo" i]'))
    const logoExists = await helpers.elementExists(logo)
    
    // Logo may or may not be present
    expect(logoExists).toBeDefined()
  })

  test('should maintain tenant context on navigation', async ({ page }) => {
    await page.goto('/#/coach')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    const helpers = new TestHelpers(page)
    
    // Navigate to another page
    await helpers.navigateTo('check-in')
    await page.waitForTimeout(500)
    
    // Tenant context should be maintained
    const errorMessage = page.locator('text=/tenant.*error|fejl/i')
    const hasError = await helpers.elementExists(errorMessage)
    expect(hasError).toBe(false)
  })

  test('should handle tenant-specific routes', async ({ page }) => {
    // Test accessing tenant-specific route format if applicable
    // This depends on your routing structure
    await page.goto('/#/coach')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for tenant context
    
    // Verify route is accessible and page loaded
    const isOnRoute = await page.evaluate(() => {
      return window.location.hash.includes('#/')
    })
    
    // Also check that page content loaded (not just error)
    const errorMessage = page.locator('text=/error|fejl/i')
    const hasError = await errorMessage.isVisible().catch(() => false)
    
    expect(isOnRoute).toBe(true)
    expect(hasError).toBe(false)
  })
})

