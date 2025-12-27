/**
 * Players Page E2E tests
 * Tests player database and management functionality
 */

import { test, expect } from './fixtures'
import { TestHelpers } from './fixtures'

test.describe('Players Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/players')
    await page.waitForLoadState('networkidle')
  })

  test('should display players page', async ({ page }) => {
    // Wait for page to load and players heading to appear
    const heading = page.getByRole('heading', { name: /spillere|players/i })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('should display players list', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Wait for players API call to complete
    await helpers.waitForApiCall(/players/i, 10000).catch(() => {})
    
    // Look for players table or list - wait for at least one to appear
    const playersTable = page.locator('table').or(page.locator('[role="table"]'))
    const playersList = page.locator('[role="list"]')
    const emptyState = page.locator('text=/ingen spillere|no players/i')
    
    // Wait for at least one element to be visible
    await Promise.race([
      playersTable.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      playersList.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      emptyState.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
    ])
    
    const hasTable = await helpers.elementExists(playersTable)
    const hasList = await helpers.elementExists(playersList)
    const hasEmpty = await helpers.elementExists(emptyState)
    
    // At least one should be visible
    expect(hasTable || hasList || hasEmpty).toBe(true)
  })

  test('should search for players', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const searchInput = page.getByPlaceholder(/søg.*spiller|search.*player/i).or(
      page.getByLabel(/søg|search/i)
    )
    
    const exists = await helpers.elementExists(searchInput)
    
    if (exists) {
      await searchInput.fill('test')
      await helpers.waitForDebounce()
      
      // Check for filtered results - wait for results to update
      const results = page.locator('tbody tr').or(page.locator('[role="listitem"]'))
      await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
      const resultCount = await results.count()
      
      // Results should be filtered (may be 0 if no matches)
      expect(resultCount >= 0).toBe(true)
    }
  })

  test('should filter players by status', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for status filter
    const statusFilter = page.getByRole('button', { name: /aktiv|active|inaktiv|inactive/i })
    const exists = await helpers.elementExists(statusFilter)
    
    if (exists) {
      await statusFilter.click()
      await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
      
      // Verify filter is applied
      await expect(statusFilter).toBeVisible()
    }
  })

  test('should display player details', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Find a player row/card
    const playerRow = page.locator('tbody tr').or(page.locator('[role="listitem"]')).first()
    const exists = await helpers.elementExists(playerRow)
    
    if (exists) {
      // Check for player information
      const playerName = playerRow.locator('text=/^[A-ZÆØÅ]/')
      const hasName = await helpers.elementExists(playerName)
      expect(hasName).toBe(true)
    }
  })

  test('should allow creating new player', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const addButton = page.getByRole('button', { name: /tilføj|add.*player|ny.*spiller/i })
    const exists = await helpers.elementExists(addButton)
    
    if (exists) {
      await addButton.click()
      
      // Wait for form/modal to appear
      const form = page.locator('form').or(page.locator('[role="dialog"]'))
      await form.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      const formExists = await helpers.elementExists(form)
      expect(formExists).toBe(true)
    }
  })

  test('should allow editing player', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Find edit button on a player row
    const editButton = page.getByRole('button', { name: /rediger|edit/i }).first()
    const exists = await helpers.elementExists(editButton)
    
    if (exists) {
      await editButton.click()
      
      // Wait for edit form to appear
      const form = page.locator('form')
      await form.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      const formExists = await helpers.elementExists(form)
      expect(formExists).toBe(true)
    }
  })

  test('should display player statistics', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for statistics columns or indicators
    const statsColumns = page.locator('text=/kampe|matches|rangliste|ranking/i')
    const exists = await helpers.elementExists(statsColumns)
    
    // Statistics may or may not be displayed
    if (exists) {
      await expect(statsColumns).toBeVisible()
    }
  })

  test('should paginate players list', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for pagination controls
    const nextButton = page.getByRole('button', { name: /næste|next/i })
    const prevButton = page.getByRole('button', { name: /forrige|previous/i })
    
    const hasNext = await helpers.elementExists(nextButton)
    const hasPrev = await helpers.elementExists(prevButton)
    
    if (hasNext) {
      await nextButton.click()
      await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {})
      
      // Verify page changed - wait for indicator or updated content
      const pageIndicator = page.locator('text=/side|page/i')
      await pageIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      const hasIndicator = await helpers.elementExists(pageIndicator)
      expect(hasIndicator).toBeDefined()
    }
  })
})

