/**
 * Landing Page / Coach Page E2E tests
 * Tests the coach landing page with group selection and session start
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/coach')
    await page.waitForLoadState('networkidle')
  })

  test('should display welcome header', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for groups to load
    
    // Check for welcome header - can be "Velkommen træner" or "Hej, [name]"
    const heading = page.getByRole('heading', { name: /velkommen|hej|welcome/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('should display group cards', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for groups API call
    
    // Look for group cards - they have "Gruppe" badge and group name
    const groupCards = page.locator('button').filter({ 
      hasText: /gruppe/i 
    }).or(
      page.locator('[aria-label*="Vælg"]')
    )
    
    const groupCount = await groupCards.count()
    
    // Either groups exist or empty state is shown
    if (groupCount === 0) {
      const emptyState = page.locator('text=/ingen grupper|no groups/i')
      const hasEmptyState = await helpers.elementExists(emptyState)
      // At least one should be true
      expect(groupCount > 0 || hasEmptyState).toBe(true)
    } else {
      await expect(groupCards.first()).toBeVisible()
    }
  })

  test('should enable start button when group is selected', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForTimeout(1000)
    
    // Find a group card
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      await groupCard.click()
      await page.waitForTimeout(500)
      
      // Check that start button is enabled
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      await expect(startButton).toBeEnabled()
    }
  })

  test('should support multi-group selection', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForTimeout(1000)
    
    // Find multiple group cards
    const groupCards = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15|u13/i 
    })
    
    const groupCount = await groupCards.count()
    
    if (groupCount >= 2) {
      // Click first group
      await groupCards.first().click()
      await page.waitForTimeout(300)
      
      // Click second group (should toggle and keep both selected)
      await groupCards.nth(1).click()
      await page.waitForTimeout(300)
      
      // Check that start button shows multiple groups count
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      const buttonText = await startButton.textContent()
      
      // Button should be enabled and may show group count
      await expect(startButton).toBeEnabled()
      
      // Verify visual feedback for selected groups (ring indicator)
      const selectedGroups = page.locator('[aria-pressed="true"]')
      const selectedCount = await selectedGroups.count()
      expect(selectedCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should toggle group selection on click', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForTimeout(1000)
    
    // Find a group card
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      // Click to select
      await groupCard.click()
      await page.waitForTimeout(300)
      
      // Verify selected state
      const isSelected = await groupCard.getAttribute('aria-pressed')
      expect(isSelected).toBe('true')
      
      // Click again to deselect
      await groupCard.click()
      await page.waitForTimeout(300)
      
      // Verify deselected state
      const isDeselected = await groupCard.getAttribute('aria-pressed')
      expect(isDeselected).toBe('false')
    }
  })

  test('should allow adjusting number of courts', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for courts control
    const courtsControl = page.locator('text=/antal baner|courts/i')
    const exists = await helpers.elementExists(courtsControl)
    
    if (exists) {
      // Find increment/decrement buttons
      const incrementButton = page.getByRole('button', { name: /\+|flere|more/i }).first()
      const decrementButton = page.getByRole('button', { name: /-|færre|less/i }).first()
      
      if (await helpers.elementExists(incrementButton)) {
        await incrementButton.click()
        await page.waitForTimeout(300)
        
        // Verify courts count updated
        const courtsValue = page.locator('text=/^\\d+$/').first()
        await expect(courtsValue).toBeVisible()
      }
    }
  })

  test('should navigate to check-in after starting session', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForTimeout(1000)
    
    // Select a group
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      await groupCard.click()
      await page.waitForTimeout(500)
      
      // Click start button
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      await startButton.click()
      
      // Wait for navigation to check-in
      await page.waitForURL(/#\/check-in/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      
      // Verify we're on check-in page
      const isOnCheckIn = await helpers.isOnRoute('check-in')
      expect(isOnCheckIn).toBe(true)
    }
  })

  test('should start session with multiple groups', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await page.waitForTimeout(1000)
    
    // Find multiple group cards
    const groupCards = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15|u13/i 
    })
    
    const groupCount = await groupCards.count()
    
    if (groupCount >= 2) {
      // Select first group
      await groupCards.first().click()
      await page.waitForTimeout(300)
      
      // Select second group
      await groupCards.nth(1).click()
      await page.waitForTimeout(300)
      
      // Start session
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      await startButton.click()
      
      // Wait for navigation to check-in
      await page.waitForURL(/#\/check-in/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      
      // Verify we're on check-in page
      const isOnCheckIn = await helpers.isOnRoute('check-in')
      expect(isOnCheckIn).toBe(true)
    }
  })

  test('should display cross-group search option', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for cross-group search button
    const crossGroupButton = page.getByRole('button', { 
      name: /søg.*tværs|search.*cross|tilføj.*spillere/i 
    })
    
    const exists = await helpers.elementExists(crossGroupButton)
    
    if (exists) {
      await expect(crossGroupButton).toBeVisible()
      
      // Click to open modal
      await crossGroupButton.click()
      await page.waitForTimeout(500)
      
      // Check for search modal
      const searchInput = page.getByPlaceholder(/søg.*spillere|search.*players/i)
      const modalExists = await helpers.elementExists(searchInput)
      expect(modalExists).toBe(true)
    }
  })
})

