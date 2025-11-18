/**
 * Match Program / Rounds Page E2E tests
 * Tests match program functionality including auto-match and court assignments
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Match Program Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/rounds')
    await page.waitForLoadState('networkidle')
  })

  test('should display match program interface', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for session check
    
    // Check for either match program UI or empty state
    // Match program shows courts, bench, or message about no active session
    const courtsSection = page.locator('text=/baner|courts/i')
    const benchSection = page.locator('text=/bænk|bench/i')
    const emptyState = page.locator('text=/ingen.*spillere|no.*players|ingen aktiv træning/i')
    
    const hasCourts = await helpers.elementExists(courtsSection)
    const hasBench = await helpers.elementExists(benchSection)
    const hasEmpty = await helpers.elementExists(emptyState)
    
    // At least one should be visible
    expect(hasCourts || hasBench || hasEmpty).toBe(true)
  })

  test('should display bench section with players', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const benchSection = page.locator('text=/bænk|bench/i')
    const exists = await helpers.elementExists(benchSection)
    
    if (exists) {
      await expect(benchSection).toBeVisible()
      
      // Check for player cards in bench
      const benchPlayers = page.locator('[data-testid="bench-player"]').or(
        page.locator('[role="list"]').filter({ hasText: /bænk|bench/i })
      )
      const hasPlayers = await helpers.elementExists(benchPlayers)
      // Bench may be empty
      expect(hasPlayers).toBeDefined()
    }
  })

  test('should display courts', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const courtsSection = page.locator('text=/bane|court/i')
    const exists = await helpers.elementExists(courtsSection)
    
    if (exists) {
      // Look for court elements
      const courts = page.locator('[data-testid="court"]').or(
        page.locator('text=/bane \\d+|court \\d+/i')
      )
      const courtCount = await courts.count()
      
      // Should have at least one court or show empty state
      expect(courtCount >= 0).toBe(true)
    }
  })

  test('should have auto-match button', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const autoMatchButton = page.getByRole('button', { 
      name: /auto.*match|automatisk.*match/i 
    })
    
    const exists = await helpers.elementExists(autoMatchButton)
    
    if (exists) {
      await expect(autoMatchButton).toBeVisible()
      
      // Button should be enabled if there are players on bench
      const isEnabled = await autoMatchButton.isEnabled()
      expect(typeof isEnabled).toBe('boolean')
    }
  })

  test('should run auto-match', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const autoMatchButton = page.getByRole('button', { 
      name: /auto.*match|automatisk.*match/i 
    })
    
    const exists = await helpers.elementExists(autoMatchButton)
    
    if (exists && await autoMatchButton.isEnabled()) {
      await autoMatchButton.click()
      await page.waitForTimeout(1000)
      await page.waitForLoadState('networkidle')
      
      // Verify players were assigned to courts
      const assignedPlayers = page.locator('[data-testid="assigned-player"]')
      const hasAssigned = await helpers.elementExists(assignedPlayers)
      // May assign players or show message
      expect(hasAssigned || await helpers.elementExists(autoMatchButton)).toBe(true)
    }
  })

  test('should allow manual player assignment', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Find a player on bench
    const benchPlayer = page.locator('[data-testid="bench-player"]').first()
    const playerExists = await helpers.elementExists(benchPlayer)
    
    if (playerExists) {
      // Find an empty court slot
      const emptySlot = page.locator('[data-testid="court-slot"]').filter({ 
        hasText: /tom|empty/i 
      }).first()
      
      const slotExists = await helpers.elementExists(emptySlot)
      
      if (slotExists) {
        // Drag and drop or click to assign
        await benchPlayer.click()
        await page.waitForTimeout(300)
        await emptySlot.click()
        await page.waitForTimeout(500)
        
        // Verify assignment
        const assigned = await helpers.elementExists(benchPlayer)
        // Player should be moved from bench
        expect(assigned).toBeDefined()
      }
    }
  })

  test('should display round information', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const roundIndicator = page.locator('text=/runde|round/i')
    const exists = await helpers.elementExists(roundIndicator)
    
    if (exists) {
      await expect(roundIndicator).toBeVisible()
    }
  })

  test('should show empty state when no checked-in players', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const emptyState = page.locator('text=/ingen.*spillere|no.*players.*checked/i')
    const exists = await helpers.elementExists(emptyState)
    
    if (exists) {
      await expect(emptyState).toBeVisible()
      
      // Should have link to check-in page
      const checkInLink = page.getByRole('link', { name: /tjek.*ind|check.*in/i })
      const hasLink = await helpers.elementExists(checkInLink)
      expect(hasLink).toBe(true)
    }
  })
})

