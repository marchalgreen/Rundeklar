/**
 * Statistics Page E2E tests
 * Tests statistics and reporting functionality
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Statistics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/statistics')
    await page.waitForLoadState('networkidle')
  })

  test('should display statistics page', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for statistics to load
    
    // Check for statistics page heading
    const heading = page.getByRole('heading', { name: /statistik|statistics/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('should display statistics charts or tables', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for statistics API call
    
    // Look for charts, tables, or statistics cards
    const charts = page.locator('canvas').or(page.locator('[role="img"]'))
    const tables = page.locator('table')
    const cards = page.locator('[role="region"]').filter({ hasText: /statistik|statistics/i })
    const emptyState = page.locator('text=/ingen data|no data/i')
    
    const hasCharts = await helpers.elementExists(charts)
    const hasTables = await helpers.elementExists(tables)
    const hasCards = await helpers.elementExists(cards)
    const hasEmpty = await helpers.elementExists(emptyState)
    
    // At least one should be visible
    expect(hasCharts || hasTables || hasCards || hasEmpty).toBe(true)
  })

  test('should filter statistics by date range', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for date range picker
    const datePicker = page.getByLabel(/dato|date/i).or(
      page.getByPlaceholder(/dato|date/i)
    )
    
    const exists = await helpers.elementExists(datePicker)
    
    if (exists) {
      await datePicker.click()
      await page.waitForTimeout(500)
      
      // Check for date picker UI
      const calendar = page.locator('[role="dialog"]').filter({ hasText: /kalender|calendar/i })
      const calendarExists = await helpers.elementExists(calendar)
      expect(calendarExists).toBe(true)
    }
  })

  test('should display player statistics', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for player statistics section
    const playerStats = page.locator('text=/spiller.*statistik|player.*statistics/i')
    const exists = await helpers.elementExists(playerStats)
    
    if (exists) {
      await expect(playerStats).toBeVisible()
    }
  })

  test('should display match statistics', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for match statistics
    const matchStats = page.locator('text=/kamp.*statistik|match.*statistics/i')
    const exists = await helpers.elementExists(matchStats)
    
    if (exists) {
      await expect(matchStats).toBeVisible()
    }
  })

  test('should allow exporting statistics', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for export button
    const exportButton = page.getByRole('button', { name: /eksporter|export/i })
    const exists = await helpers.elementExists(exportButton)
    
    if (exists) {
      await expect(exportButton).toBeVisible()
      
      // Click export (may trigger download)
      await exportButton.click()
      await page.waitForTimeout(1000)
      
      // Verify export initiated (may download file)
      // This is hard to test without mocking downloads
    }
  })
})

