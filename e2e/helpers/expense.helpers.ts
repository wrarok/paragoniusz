import type { Page } from '@playwright/test';

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Expense data structure for creating expenses
 */
export interface ExpenseData {
  amount: string;
  category?: string;
  date?: string;
}

/**
 * Create single expense via UI
 * 
 * @param page - Playwright Page object
 * @param data - Expense data (amount required, others optional)
 * 
 * @example
 * ```typescript
 * await createExpense(page, { amount: '45.50' });
 * await createExpense(page, { 
 *   amount: '100.00', 
 *   category: 'żywność',
 *   date: '2024-01-15',
 *   note: 'Weekly groceries'
 * });
 * ```
 */
export async function createExpense(
  page: Page,
  data: ExpenseData,
  skipNavigation: boolean = false
): Promise<void> {
  // Navigate to dashboard first to ensure clean state (unless skipped for batch operations)
  if (!skipNavigation) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }
  
  // Click middle button in nav (+ icon) to open choice modal
  try {
    // Middle button in bottom nav (positional - always works)
    await page.locator('nav').locator('button, a').nth(1).click({ timeout: 5000 });
  } catch {
    // Fallback: try empty state button
    try {
      await page.click('text=Dodaj pierwszy wydatek', { timeout: 3000 });
    } catch {
      console.error('Could not find add expense button, taking screenshot');
      await page.screenshot({ path: `test-results/add-button-error-${Date.now()}.png` }).catch(() => {});
      throw new Error(`Could not open expense modal. Current URL: ${page.url()}`);
    }
  }
  
  // Wait for choice modal to open
  await page.waitForTimeout(800);
  
  // Click "Dodaj ręcznie" button in modal to open manual form
  try {
    await page.click('button:has-text("Dodaj ręcznie")', { timeout: 5000 });
  } catch (error) {
    console.error('Could not find "Dodaj ręcznie" button, taking screenshot');
    await page.screenshot({ path: `test-results/manual-button-error-${Date.now()}.png` }).catch(() => {});
    throw new Error(`Could not find "Dodaj ręcznie" button. Current URL: ${page.url()}`);
  }
  
  // Wait for form to open
  await page.waitForTimeout(1500);
  
  // Find amount input with better error handling
  const amountInput = page.locator('input[placeholder="0.00"]');
  try {
    await amountInput.waitFor({ state: 'visible', timeout: 15000 });
  } catch (error) {
    console.error('Amount input not found, taking screenshot for debugging');
    await page.screenshot({ path: `test-results/amount-input-error-${Date.now()}.png` }).catch(() => {});
    throw new Error(`Amount input not visible after 15s. Current URL: ${page.url()}`);
  }
  await amountInput.clear();
  await amountInput.fill(data.amount);
  
  // CRITICAL: Remove Astro Dev Toolbar before clicking dropdown (it intercepts pointer events)
  await page.evaluate(() => {
    const toolbar = document.querySelector('astro-dev-toolbar');
    if (toolbar) toolbar.remove();
  }).catch(() => {});
  
  // Select category - Shadcn/ui Select component
  // Click trigger to open dropdown
  await page.click('button:has-text("Wybierz kategorię")').catch(() =>
    page.locator('[role="combobox"]').first().click()
  );
  
  // Wait for dropdown to be fully visible
  await page.waitForSelector('[role="option"]', { timeout: 3000 });
  
  // Select option - Radix UI structure requires different approach
  if (data.category) {
    // Use filter with hasText for Radix UI Select
    await page.locator('[role="option"]').filter({ hasText: data.category }).click();
  } else {
    // Click first option in the list
    await page.locator('[role="option"]').first().click();
  }
  
  // Fill date if field exists - use yesterday if not provided (avoid "older than 1 year" warning)
  const dateToUse = data.date || getYesterdayDate();
  const dateInput = page.locator('input[type="date"]').or(
    page.getByLabel('Data')
  );
  
  // Only fill if date input exists (some forms may not have date picker)
  const dateExists = await dateInput.isVisible().catch(() => false);
  if (dateExists) {
    await dateInput.fill(dateToUse);
  }
  
  // Submit form (create mode uses "Dodaj wydatek")
  await page.click('button:has-text("Dodaj wydatek")').catch(() =>
    page.click('button[type="submit"]')
  );
  
  // Wait for form to close/process - shortened timeout
  await page.waitForTimeout(500);
}

/**
 * Create multiple expenses sequentially
 * 
 * @param page - Playwright Page object
 * @param expenses - Array of expense data
 * 
 * @example
 * ```typescript
 * await createMultipleExpenses(page, [
 *   { amount: '100.00', category: 'żywność' },
 *   { amount: '50.00', category: 'transport' },
 *   { amount: '75.00', category: 'żywność' }
 * ]);
 * ```
 */
export async function createMultipleExpenses(
  page: Page,
  expenses: ExpenseData[]
): Promise<void> {
  // Navigate once at the beginning to avoid navigation conflicts
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(500);
  
  const errors: string[] = [];
  
  for (let i = 0; i < expenses.length; i++) {
    try {
      console.log(`Creating expense ${i + 1}/${expenses.length}: ${expenses[i].amount}`);
      
      // For first expense, skip navigation (we just navigated)
      // For subsequent expenses, don't skip - ensure clean state
      const skipNav = i === 0;
      await createExpense(page, expenses[i], skipNav);
      
      // Longer delay between creations to allow page to fully update
      // and ensure modal is closed before next creation
      await page.waitForTimeout(1000);
      
      // Ensure we're back on dashboard and page is stable
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(500);
    } catch (error) {
      const errorMsg = `Failed to create expense ${i + 1} (${expenses[i].amount}): ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      
      // Try to recover by navigating back to dashboard
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1000);
      } catch (navError) {
        console.error('Failed to recover from error:', navError);
      }
      
      // Continue with next expense but track the error
      continue;
    }
  }
  
  // If any expenses failed to create, throw an error with details
  if (errors.length > 0) {
    throw new Error(`Failed to create ${errors.length}/${expenses.length} expenses:\n${errors.join('\n')}`);
  }
}

/**
 * Delete all expenses for current user via API (fast, reliable cleanup)
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * test.afterEach(async ({ page }) => {
 *   await deleteAllExpenses(page);
 * });
 * ```
 */
export async function deleteAllExpenses(page: Page): Promise<void> {
  // Navigate to dashboard first to ensure we're in authenticated context
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Use page.evaluate to run fetch in browser context (has cookies)
  const result = await page.evaluate(async () => {
    try {
      let allExpenses: any[] = [];
      let offset = 0;
      const limit = 100; // API max limit
      
      // Fetch all expenses with pagination
      while (true) {
        const response = await fetch(`/api/expenses?limit=${limit}&offset=${offset}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[CLEANUP] API Error ${response.status}:`, errorText);
          return { success: false, error: `Fetch failed: ${response.status} - ${errorText}` };
        }
        
        const data = await response.json();
        console.log(`[CLEANUP] API Response structure:`, Object.keys(data));
        console.log(`[CLEANUP] Full API Response:`, data);
        
        // Try different possible response structures
        const expenses = data.expenses || data.data || data || [];
        
        console.log(`[CLEANUP] Found ${expenses.length} expenses in response`);
        
        if (expenses.length === 0) {
          break; // No more expenses
        }
        
        allExpenses = allExpenses.concat(expenses);
        
        // If we got fewer than limit, we've reached the end
        if (expenses.length < limit) {
          break;
        }
        
        offset += limit;
      }
      
      console.log(`[CLEANUP] Total expenses found: ${allExpenses.length}`);
      
      if (allExpenses.length === 0) {
        return { success: true, deleted: 0 };
      }
      
      console.log(`[CLEANUP] Deleting ${allExpenses.length} expenses...`);
      
      // Delete all expenses sequentially to avoid overwhelming the API
      let deletedCount = 0;
      for (const expense of allExpenses) {
        try {
          console.log(`[CLEANUP] Deleting expense ${expense.id}...`);
          const deleteResponse = await fetch(`/api/expenses/${expense.id}`, {
            method: 'DELETE'
          });
          console.log(`[CLEANUP] Delete response: ${deleteResponse.status}`);
          if (deleteResponse.ok || deleteResponse.status === 404) {
            deletedCount++;
          } else {
            const errorText = await deleteResponse.text();
            console.warn(`[CLEANUP] Failed to delete ${expense.id}: ${deleteResponse.status} - ${errorText}`);
          }
        } catch (error) {
          console.warn(`[CLEANUP] Exception deleting expense ${expense.id}:`, error);
        }
      }
      
      console.log(`[CLEANUP] Deleted ${deletedCount}/${allExpenses.length} expenses`);
      
      return { success: true, deleted: deletedCount, total: allExpenses.length };
    } catch (error) {
      console.error('[CLEANUP] Exception in deleteAllExpenses:', error);
      return { success: false, error: String(error) };
    }
  });
  
  if (!result.success) {
    console.warn('[CLEANUP] Failed to delete expenses:', result.error);
  } else {
    console.log(`[CLEANUP] Successfully deleted ${result.deleted} expenses`);
  }
  
  // Longer delay to ensure DB commits and UI updates
  await page.waitForTimeout(2000);
  
  // Verify cleanup worked
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const remainingExpenses = await page.$$('[data-testid="expense-card"]');
  if (remainingExpenses.length > 0) {
    console.warn(`[CLEANUP] WARNING: ${remainingExpenses.length} expenses still visible after cleanup!`);
  }
}

/**
 * Delete all expenses via UI (slow but tests UI interactions)
 * Use this ONLY when testing delete UI functionality
 * For cleanup, use deleteAllExpenses() which uses API
 *
 * @param page - Playwright Page object
 */
export async function deleteAllExpensesViaUI(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  let maxIterations = 50; // Reduced limit since this is slow
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    
    const hasExpenses = await page.isVisible('[data-testid="expense-card"]');
    if (!hasExpenses) break;
    
    const deleteButtons = await page.$$('button:has-text("Usuń")');
    if (deleteButtons.length === 0) break;
    
    try {
      await deleteButtons[0].click();
      const confirmButton = page.locator('button:has-text("Usuń")').last();
      await confirmButton.waitFor({ state: 'visible', timeout: 3000 });
      await confirmButton.click();
      await page.waitForTimeout(1000);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    } catch (error) {
      console.warn('Delete operation failed:', error);
      break;
    }
  }
}

/**
 * Get expense count from dashboard
 * 
 * @param page - Playwright Page object
 * @returns Number of expenses displayed
 * 
 * @example
 * ```typescript
 * const count = await getExpenseCount(page);
 * expect(count).toBe(5);
 * ```
 */
export async function getExpenseCount(page: Page): Promise<number> {
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  const expenses = await page.$$('[data-testid="expense-card"]');
  return expenses.length;
}

/**
 * Edit existing expense
 * 
 * @param page - Playwright Page object
 * @param index - Index of expense to edit (0-based)
 * @param data - New expense data (partial update)
 * 
 * @example
 * ```typescript
 * await editExpense(page, 0, { amount: '99.99' });
 * ```
 */
export async function editExpense(
  page: Page,
  index: number,
  data: Partial<ExpenseData>
): Promise<void> {
  await page.goto('/');
  
  // Click edit button for specified expense
  const editButtons = await page.$$('button:has-text("Edytuj")');
  if (editButtons[index]) {
    await editButtons[index].click();
  } else {
    throw new Error(`Expense at index ${index} not found`);
  }
  
  // Wait for edit form - wait for amount input to be visible
  await page.waitForSelector('input[placeholder="0.00"]', { timeout: 5000 });
  
  // Update fields if provided
  if (data.amount) {
    const amountInput = page.locator('input[placeholder="0.00"]');
    await amountInput.fill(data.amount);
  }
  
  if (data.category) {
    // CRITICAL: Remove Astro Dev Toolbar before clicking dropdown
    await page.evaluate(() => {
      const toolbar = document.querySelector('astro-dev-toolbar');
      if (toolbar) toolbar.remove();
    }).catch(() => {});
    
    // Open category dropdown
    await page.click('[role="combobox"]').catch(() =>
      page.click('button:has-text("Wybierz kategorię")')
    );
    // Wait for options to appear
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    // Select category using filter (Radix UI)
    await page.locator('[role="option"]').filter({ hasText: data.category }).click();
  }
  
  if (data.date) {
    const dateInput = page.locator('input[type="date"]').or(
      page.getByLabel('Data')
    );
    await dateInput.fill(data.date);
  }
  
  // Save changes (edit mode uses "Zapisz zmiany")
  await page.click('button:has-text("Zapisz zmiany")').catch(() =>
    page.click('button[type="submit"]')
  );
  await page.waitForTimeout(1500);
}

/**
 * Delete specific expense by index
 * 
 * @param page - Playwright Page object
 * @param index - Index of expense to delete (0-based)
 * 
 * @example
 * ```typescript
 * await deleteExpense(page, 0); // Delete first expense
 * ```
 */
export async function deleteExpense(page: Page, index: number): Promise<void> {
  await page.goto('/');
  
  // Click delete button for specified expense
  const deleteButtons = await page.$$('button:has-text("Usuń")');
  if (deleteButtons[index]) {
    await deleteButtons[index].click();
    
    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Usuń")').last();
    await confirmButton.click();
    
    await page.waitForTimeout(1000);
  } else {
    throw new Error(`Expense at index ${index} not found`);
  }
}

/**
 * Get total spent amount from dashboard
 * 
 * @param page - Playwright Page object
 * @returns Total amount as number
 * 
 * @example
 * ```typescript
 * const total = await getTotalSpent(page);
 * expect(total).toBeGreaterThan(0);
 * ```
 */
export async function getTotalSpent(page: Page): Promise<number> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // DashboardSummary displays amount in <p class="text-4xl font-bold">
  const totalText = await page.locator('p.text-4xl').first().textContent();
  
  if (!totalText) {
    return 0;
  }
  
  // Extract number from text (e.g., "225.00 PLN" -> 225.00)
  const match = totalText.match(/[\d,.]+/);
  if (match) {
    return parseFloat(match[0].replace(',', '.'));
  }
  
  return 0;
}

/**
 * Filter expenses by date range
 * 
 * @param page - Playwright Page object
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * 
 * @example
 * ```typescript
 * await filterByDateRange(page, '2024-01-01', '2024-01-31');
 * ```
 */
export async function filterByDateRange(
  page: Page,
  fromDate: string,
  toDate: string
): Promise<void> {
  await page.goto('/');
  
  // Fill date filters
  await page.fill('input[name="from_date"]', fromDate);
  await page.fill('input[name="to_date"]', toDate);
  
  // Apply filter
  await page.click('button:has-text("Filtruj")');
  
  // Wait for results to update
  await page.waitForTimeout(1000);
}

/**
 * Filter expenses by category
 * 
 * @param page - Playwright Page object
 * @param category - Category name (e.g., 'żywność')
 * 
 * @example
 * ```typescript
 * await filterByCategory(page, 'żywność');
 * ```
 */
export async function filterByCategory(
  page: Page,
  category: string
): Promise<void> {
  await page.goto('/');
  
  // Select category filter
  await page.selectOption('select[name="category_filter"]', { label: category });
  
  // Apply filter
  await page.click('button:has-text("Filtruj")');
  
  // Wait for results to update
  await page.waitForTimeout(1000);
}

/**
 * Clear all filters
 * 
 * @param page - Playwright Page object
 * 
 * @example
 * ```typescript
 * await clearFilters(page);
 * ```
 */
export async function clearFilters(page: Page): Promise<void> {
  await page.goto('/');
  
  const clearButton = page.locator('button:has-text("Wyczyść filtry")');
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForTimeout(500);
  }
}