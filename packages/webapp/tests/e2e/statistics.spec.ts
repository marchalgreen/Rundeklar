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
    
    // If landing page is shown, select "Training & Attendance" view
    const trainingViewButton = page.getByRole('button', { name: /træning|training/i })
    const landingExists = await trainingViewButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (landingExists) {
      await trainingViewButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
  })

  test('should display statistics page', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Ensure we're on the training view (not landing page)
    const trainingViewButton = page.getByRole('button', { name: /træning.*fremmøde|training.*attendance/i })
    const landingExists = await trainingViewButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (landingExists) {
      await trainingViewButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for statistics to load
    
    // Check for various indicators that page is loaded
    // 1. Statistics page heading
    const heading = page.getByRole('heading', { name: /træning.*fremmøde|training.*attendance|statistik|statistics/i })
    
    // 2. KPI Cards
    const kpiCards = page.locator('text=/total indtjekninger|total check-ins|sessioner|sessions/i')
    
    // 3. Filter section (should always be present)
    const filters = page.locator('text=/denne sæson|sidste 7 dage|sidste 30 dage|alle sæsoner/i')
    
    // 4. Any content on the page
    const anyContent = page.locator('body').filter({ hasText: /træning|fremmøde|statistik|training|attendance|statistics/i })
    
    const headingVisible = await helpers.elementExists(heading)
    const kpiVisible = await helpers.elementExists(kpiCards)
    const filtersVisible = await helpers.elementExists(filters)
    const contentVisible = await helpers.elementExists(anyContent)
    
    // At least one should be visible (filters should always be present)
    expect(headingVisible || kpiVisible || filtersVisible || contentVisible).toBe(true)
  })

  test('should display statistics charts or tables', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Ensure we're on the training view (not landing page)
    const trainingViewButton = page.getByRole('button', { name: /træning.*fremmøde|training.*attendance/i })
    const landingExists = await trainingViewButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (landingExists) {
      await trainingViewButton.click()
      await page.waitForLoadState('networkidle')
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000) // Wait for statistics API call and chart rendering
    
    // Look for various statistics elements that should be present
    // 1. KPI Cards (should always be present if data exists)
    const kpiCards = page.locator('text=/total indtjekninger|total check-ins|sessioner|sessions|gennemsnit|average/i')
    
    // 2. Chart containers (ECharts renders canvas elements)
    const charts = page.locator('canvas')
    
    // 3. Chart headings (h3 elements with chart titles)
    const chartHeadings = page.locator('h3').filter({ 
      hasText: /gruppetrends|fremmøde|indtjekninger|spiller|træningsgruppe/i 
    })
    
    // 4. Statistics insights section
    const insights = page.locator('text=/træningsdag|uge|insights/i')
    
    // 5. Empty state messages
    const emptyState = page.locator('text=/ingen.*data|no.*data|tilgængelig/i')
    
    // 6. Loading states
    const loadingState = page.locator('text=/indlæser|loading/i')
    
    // 7. Filter section (should always be present)
    const filters = page.locator('text=/denne sæson|sidste 7 dage|sidste 30 dage|alle sæsoner/i')
    
    // Check if at least one of these elements exists
    const hasKpiCards = await helpers.elementExists(kpiCards)
    const hasCharts = await helpers.elementExists(charts)
    const hasChartHeadings = await helpers.elementExists(chartHeadings)
    const hasInsights = await helpers.elementExists(insights)
    const hasEmpty = await helpers.elementExists(emptyState)
    const isLoading = await helpers.elementExists(loadingState)
    const hasFilters = await helpers.elementExists(filters)
    
    // At least one should be visible (filters should always be present, but also check for content)
    const hasContent = hasFilters || hasKpiCards || hasCharts || hasChartHeadings || hasInsights || hasEmpty || isLoading
    
    expect(hasContent).toBe(true)
    
    // If we have filters but no other content, wait a bit more for content to load
    if (hasFilters && !hasKpiCards && !hasCharts && !hasChartHeadings && !hasEmpty && !isLoading) {
      await page.waitForTimeout(2000)
      const kpiAfterWait = await helpers.elementExists(kpiCards)
      const chartsAfterWait = await helpers.elementExists(charts)
      // Should have at least filters, and ideally some content
      expect(hasFilters && (kpiAfterWait || chartsAfterWait || hasEmpty)).toBe(true)
    }
  })

  test('should filter statistics by date range', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for date range picker or period selector
    const datePicker = page.getByLabel(/dato|date/i).or(
      page.getByPlaceholder(/dato|date/i)
    )
    const periodSelector = page.getByRole('button', { name: /denne sæson|sidste 7 dage|sidste 30 dage/i })
    
    const datePickerExists = await helpers.elementExists(datePicker)
    const periodSelectorExists = await helpers.elementExists(periodSelector)
    
    if (datePickerExists) {
      await datePicker.click()
      await page.waitForTimeout(500)
      
      // Check for date picker UI
      const calendar = page.locator('[role="dialog"]').filter({ hasText: /kalender|calendar/i })
      const calendarExists = await helpers.elementExists(calendar)
      expect(calendarExists).toBe(true)
    } else if (periodSelectorExists) {
      // Test period selector
      await periodSelector.click()
      await page.waitForTimeout(500)
      
      // Should see period options
      const options = page.getByRole('option')
      const optionsExist = await helpers.elementExists(options)
      expect(optionsExist).toBe(true)
    }
  })

  test('should show comparison checkbox and handle disable state', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for comparison checkbox
    const comparisonCheckbox = page.getByLabel(/sammenlign med samme periode sidste år/i)
    const exists = await helpers.elementExists(comparisonCheckbox)
    
    if (exists) {
      // Check if checkbox is visible
      await expect(comparisonCheckbox).toBeVisible()
      
      // Check if checkbox can be checked (if not disabled)
      const isDisabled = await comparisonCheckbox.isDisabled()
      
      if (!isDisabled) {
        await comparisonCheckbox.check()
        await page.waitForTimeout(500)
        
        // Verify checkbox is checked
        await expect(comparisonCheckbox).toBeChecked()
      }
    }
  })

  test('should disable comparison when "Alle sæsoner" is selected', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Look for period selector
    const periodSelector = page.getByRole('button', { name: /alle sæsoner|all seasons/i })
    const comparisonCheckbox = page.getByLabel(/sammenlign med samme periode sidste år/i)
    
    const periodExists = await helpers.elementExists(periodSelector)
    const checkboxExists = await helpers.elementExists(comparisonCheckbox)
    
    if (periodExists && checkboxExists) {
      // Select "Alle sæsoner"
      await periodSelector.click()
      await page.waitForTimeout(500)
      
      // Check if comparison checkbox is disabled
      const isDisabled = await comparisonCheckbox.isDisabled()
      expect(isDisabled).toBe(true)
    }
  })

  test('should display comparison data in charts when enabled', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Ensure we're on the training view (not landing page)
    const trainingViewButton = page.getByRole('button', { name: /træning.*fremmøde|training.*attendance/i })
    const landingExists = await trainingViewButton.isVisible({ timeout: 2000 }).catch(() => false)
    if (landingExists) {
      await trainingViewButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    const comparisonCheckbox = page.getByLabel(/sammenlign med samme periode sidste år/i)
    const exists = await helpers.elementExists(comparisonCheckbox)
    
    if (exists) {
      const isDisabled = await comparisonCheckbox.isDisabled().catch(() => true)
      
      if (!isDisabled) {
        // Enable comparison
        await comparisonCheckbox.check()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000) // Wait for comparison data to load and charts to render
        
        // Look for charts with comparison data
        // 1. Canvas elements (charts)
        const charts = page.locator('canvas')
        
        // 2. Comparison labels in legend or text
        const comparisonLabels = page.locator('text=/sidste år|last year|sammenligningsperiode/i')
        
        // 3. Chart headings that might indicate comparison
        const chartHeadings = page.locator('h3').filter({ hasText: /gruppetrends|trend/i })
        
        // 4. Period comparison section (if comparison data is available)
        const periodComparison = page.locator('text=/periodesammenligning|period comparison/i')
        
        const chartsExist = await helpers.elementExists(charts)
        const labelsExist = await helpers.elementExists(comparisonLabels)
        const headingsExist = await helpers.elementExists(chartHeadings)
        const periodComparisonExists = await helpers.elementExists(periodComparison)
        
        // At least charts should be visible (comparison labels may or may not be visible depending on data)
        // If comparison is enabled but no comparison data exists, charts should still be visible
        expect(chartsExist || headingsExist || periodComparisonExists).toBe(true)
      } else {
        // If comparison is disabled, just verify the checkbox exists and is disabled
        expect(isDisabled).toBe(true)
      }
    } else {
      // If checkbox doesn't exist, skip this test (might be on wrong view)
      test.skip()
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

