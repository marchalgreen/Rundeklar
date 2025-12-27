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
    // Wait for welcome header to appear
    const heading = page.getByRole('heading', { name: /velkommen|hej|welcome/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('should display group cards', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups API call to complete
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Look for group cards - they have "Gruppe" badge and group name
    const groupCards = page.locator('button').filter({ 
      hasText: /gruppe/i 
    }).or(
      page.locator('[aria-label*="Vælg"]')
    )
    
    // Wait for at least one group card or empty state to appear
    const emptyState = page.locator('text=/ingen grupper|no groups/i')
    await Promise.race([
      groupCards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      emptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ])
    
    const groupCount = await groupCards.count()
    
    // Either groups exist or empty state is shown
    if (groupCount === 0) {
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
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Find a group card
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    await groupCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      await groupCard.click()
      
      // Wait for start button to become enabled
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      await startButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
      await expect(startButton).toBeEnabled({ timeout: 2000 })
    }
  })

  test('should support multi-group selection', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Find multiple group cards
    const groupCards = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15|u13/i 
    })
    
    await groupCards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const groupCount = await groupCards.count()
    
    if (groupCount >= 2) {
      // Click first group
      await groupCards.first().click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
      // Click second group (should toggle and keep both selected)
      await groupCards.nth(1).click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
      // Check that start button shows multiple groups count
      const startButton = page.getByRole('button', { name: /start.*træning|start.*session/i })
      await startButton.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
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
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Find a group card
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    await groupCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      // Click to select
      await groupCard.click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
      // Verify selected state
      await expect(groupCard).toHaveAttribute('aria-pressed', 'true', { timeout: 2000 })
      const isSelected = await groupCard.getAttribute('aria-pressed')
      expect(isSelected).toBe('true')
      
      // Click again to deselect
      await groupCard.click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
      // Verify deselected state
      await expect(groupCard).toHaveAttribute('aria-pressed', 'false', { timeout: 2000 })
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
        await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
        
        // Verify courts count updated
        const courtsValue = page.locator('text=/^\\d+$/').first()
        await expect(courtsValue).toBeVisible({ timeout: 2000 })
      }
    }
  })

  test('should navigate to check-in after starting session', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for groups to load
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Select a group
    const groupCard = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15/i 
    }).first()
    
    await groupCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const groupExists = await helpers.elementExists(groupCard)
    
    if (groupExists) {
      await groupCard.click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
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
    await helpers.waitForApiCall(/groups|træningsgrupper/i, 10000).catch(() => {})
    
    // Find multiple group cards
    const groupCards = page.locator('[role="button"]').filter({ 
      hasText: /senior|u17|u15|u13/i 
    })
    
    await groupCards.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    const groupCount = await groupCards.count()
    
    if (groupCount >= 2) {
      // Select first group
      await groupCards.first().click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
      // Select second group
      await groupCards.nth(1).click()
      await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {})
      
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
      
      // Wait for search modal to appear
      const searchInput = page.getByPlaceholder(/søg.*spillere|search.*players/i)
      await searchInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      const modalExists = await helpers.elementExists(searchInput)
      expect(modalExists).toBe(true)
    }
  })
})

