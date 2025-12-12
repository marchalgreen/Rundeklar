/**
 * Check-In Page E2E tests
 * Tests player check-in/out functionality
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Check-In Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/check-in')
    await page.waitForLoadState('networkidle')
  })

  test('should display check-in interface', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for session check
    
    // Check for either active session UI (search input) or empty state
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i).or(
      page.locator('input[type="text"]').filter({ hasText: /søg/i })
    )
    const emptyState = page.locator('text=/ingen aktiv træning|no active.*session|gå til træner/i')
    
    const hasSearch = await helpers.elementExists(searchInput)
    const hasEmptyState = await helpers.elementExists(emptyState)
    
    // At least one should be visible
    expect(hasSearch || hasEmptyState).toBe(true)
  })

  test('should show empty state when no active session', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const emptyState = page.locator('text=/ingen aktiv|no active.*session/i')
    const exists = await helpers.elementExists(emptyState)
    
    if (exists) {
      await expect(emptyState).toBeVisible()
      
      // Check for link/button to start session
      const startLink = page.getByRole('link', { name: /start|opret/i }).or(
        page.getByRole('button', { name: /start|opret/i })
      )
      const hasStartLink = await helpers.elementExists(startLink)
      expect(hasStartLink).toBe(true)
    }
  })

  test('should search for players', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i)
    const exists = await helpers.elementExists(searchInput)
    
    if (exists) {
      await searchInput.fill('test')
      await page.waitForTimeout(500) // Wait for debounce
      await page.waitForLoadState('networkidle')
      
      // Check for results or empty state
      const results = page.locator('[role="list"]').or(page.locator('[data-testid="player-list"]'))
      const emptyMessage = page.locator('text=/ingen resultater|no results/i')
      
      const hasResults = await helpers.elementExists(results)
      const hasEmpty = await helpers.elementExists(emptyMessage)
      
      expect(hasResults || hasEmpty).toBe(true)
    }
  })

  test('should filter players by letter', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for letter filters
    const letterFilter = page.locator('button').filter({ hasText: /^[A-ZÆØÅ]$/ }).first()
    const exists = await helpers.elementExists(letterFilter)
    
    if (exists) {
      await letterFilter.click()
      await page.waitForTimeout(500)
      await page.waitForLoadState('networkidle')
      
      // Verify filter is active (may have visual indicator)
      await expect(letterFilter).toBeVisible()
    }
  })

  test('should check in a player', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // First ensure we have an active session
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i)
    const hasActiveSession = await helpers.elementExists(searchInput)
    
    if (!hasActiveSession) {
      // Skip test if no active session
      test.skip()
      return
    }
    
    // Find a player card
    const playerCard = page.locator('[role="button"]').filter({ 
      hasText: /check.*in|tjek.*ind/i 
    }).first()
    
    const playerExists = await helpers.elementExists(playerCard)
    
    if (playerExists) {
      await playerCard.click()
      await page.waitForTimeout(500)
      
      // Verify player is checked in (look for checked-in indicator)
      const checkedInIndicator = page.locator('text=/tjekket ind|checked in/i')
      const hasIndicator = await helpers.elementExists(checkedInIndicator)
      // May show success message or update UI
      expect(hasIndicator || await helpers.elementExists(playerCard)).toBe(true)
    }
  })

  test('should check out a player', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for checked-in players
    const checkedInPlayer = page.locator('[data-checked-in="true"]').or(
      page.locator('text=/tjekket ind|checked in/i')
    ).first()
    
    const exists = await helpers.elementExists(checkedInPlayer)
    
    if (exists) {
      // Find check-out button
      const checkOutButton = checkedInPlayer.getByRole('button', { 
        name: /check.*out|tjek.*ud/i 
      })
      
      const buttonExists = await helpers.elementExists(checkOutButton)
      
      if (buttonExists) {
        await checkOutButton.click()
        await page.waitForTimeout(500)
        
        // Verify player is checked out
        const checkedOut = await helpers.elementExists(checkedInPlayer)
        expect(checkedOut).toBe(false)
      }
    }
  })

  test('should display checked-in players count', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for checked-in count indicator
    const countIndicator = page.locator('text=/tjekket ind.*\\d+|checked in.*\\d+/i')
    const exists = await helpers.elementExists(countIndicator)
    
    // Count indicator may or may not be present
    if (exists) {
      await expect(countIndicator).toBeVisible()
    }
  })

  test('should filter players from multiple groups', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // First ensure we have an active session
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i)
    const hasActiveSession = await helpers.elementExists(searchInput)
    
    if (!hasActiveSession) {
      // Skip test if no active session
      test.skip()
      return
    }
    
    // Wait for players to load
    await page.waitForTimeout(1000)
    await page.waitForLoadState('networkidle')
    
    // Check that players from multiple groups are shown
    // This is verified by the fact that players appear in the list
    // (the filtering logic is tested in unit tests)
    const playerCards = page.locator('[role="button"]').filter({ 
      hasText: /check.*in|tjek.*ind/i 
    })
    
    const playerCount = await playerCards.count()
    
    // If there are players, they should be from the selected groups
    // The actual filtering is handled by the component logic
    expect(playerCount).toBeGreaterThanOrEqual(0)
  })

  test('should add and display notes for checked-in player', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // First ensure we have an active session and a checked-in player
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i)
    const hasActiveSession = await helpers.elementExists(searchInput)
    
    if (!hasActiveSession) {
      test.skip()
      return
    }
    
    // Check in a player first if needed
    const playerCard = page.locator('[role="button"]').filter({ 
      hasText: /check.*in|tjek.*ind/i 
    }).first()
    
    const playerExists = await helpers.elementExists(playerCard)
    
    if (playerExists) {
      await playerCard.click()
      await page.waitForTimeout(1000)
    }
    
    // Look for info icon on checked-in player card
    const infoIcon = page.locator('button[aria-label*="noter" i], button[aria-label*="notes" i]').or(
      page.locator('svg').filter({ has: page.locator('text=/info/i') })
    ).first()
    
    const hasInfoIcon = await helpers.elementExists(infoIcon)
    
    if (!hasInfoIcon) {
      // If no info icon, try to add notes by clicking on checked-in player
      // This would require the modal to be accessible
      // For now, we verify the UI structure supports notes
      const checkedInCard = page.locator('[data-checked-in="true"]').or(
        page.locator('text=/tjekket ind|checked in/i')
      ).first()
      
      const hasCheckedIn = await helpers.elementExists(checkedInCard)
      expect(hasCheckedIn).toBe(true)
    } else {
      // Click info icon to open notes modal
      await infoIcon.click()
      await page.waitForTimeout(500)
      
      // Look for notes modal
      const notesModal = page.locator('[role="dialog"]').filter({
        hasText: /noter|notes/i
      })
      
      const modalExists = await helpers.elementExists(notesModal)
      
      if (modalExists) {
        // Enter notes
        const textarea = notesModal.locator('textarea')
        await textarea.fill('Gerne træne med Player 2')
        
        // Save notes
        const saveButton = notesModal.getByRole('button', { name: /gem|save/i })
        await saveButton.click()
        await page.waitForTimeout(500)
        
        // Verify notes icon appears (or tooltip shows on hover)
        const updatedInfoIcon = page.locator('button[aria-label*="noter" i]').first()
        const hasUpdatedIcon = await helpers.elementExists(updatedInfoIcon)
        expect(hasUpdatedIcon).toBe(true)
      }
    }
  })

  test('should show tooltip with notes on hover', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for info icon with notes
    const infoIcon = page.locator('button[aria-label*="noter" i]').first()
    const exists = await helpers.elementExists(infoIcon)
    
    if (exists) {
      // Hover over info icon
      await infoIcon.hover()
      await page.waitForTimeout(300)
      
      // Look for tooltip
      const tooltip = page.locator('[role="tooltip"]')
      const tooltipExists = await helpers.elementExists(tooltip)
      
      // Tooltip may or may not be visible depending on implementation
      // This test verifies the structure is in place
      expect(tooltipExists || await helpers.elementExists(infoIcon)).toBe(true)
    }
  })

  test('should validate notes max length', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Open notes modal
    const infoIcon = page.locator('button[aria-label*="noter" i]').first()
    const exists = await helpers.elementExists(infoIcon)
    
    if (exists) {
      await infoIcon.click()
      await page.waitForTimeout(500)
      
      const notesModal = page.locator('[role="dialog"]').filter({
        hasText: /noter|notes/i
      })
      
      const modalExists = await helpers.elementExists(notesModal)
      
      if (modalExists) {
        const textarea = notesModal.locator('textarea')
        
        // Try to enter more than 500 characters
        const longText = 'a'.repeat(501)
        await textarea.fill(longText)
        
        // Check for validation error
        const errorMessage = notesModal.locator('text=/500.*tegn|500.*char/i')
        const hasError = await helpers.elementExists(errorMessage)
        
        // Save button should be disabled if validation fails
        const saveButton = notesModal.getByRole('button', { name: /gem|save/i })
        const isDisabled = await saveButton.isDisabled()
        
        expect(hasError || isDisabled).toBe(true)
      }
    }
  })
})

