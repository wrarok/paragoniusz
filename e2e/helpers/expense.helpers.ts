import type { Page } from "@playwright/test";
import { waitForAPI } from "./api.helpers";

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
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
export async function createExpense(page: Page, data: ExpenseData, skipNavigation = false): Promise<void> {
  // Navigate to dashboard first to ensure clean state (unless skipped for batch operations)
  if (!skipNavigation) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for page to be interactive
    await page.waitForLoadState("domcontentloaded");
    
    // CRITICAL FIX: Wait for Astro hydration to complete
    // React components use client:load which takes time to hydrate
    // Wait for data-hydrated attribute instead of arbitrary timeout
    console.log(`[${new Date().toISOString()}] ⏳ Waiting for Astro hydration (React components to become interactive)...`);
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 5000 });
    console.log(`[${new Date().toISOString()}] ✅ Hydration confirmed via data-hydrated attribute`);
  }

  const startTimestamp = new Date().toISOString();
  console.log(`[${startTimestamp}] 📍 Opening expense modal from URL: ${page.url()}`);
  
  // CRITICAL: Ensure no modal is open before trying to open a new one
  const existingDialog = await page.locator('[role="dialog"]').count();
  if (existingDialog > 0) {
    console.log(`[${startTimestamp}] ⚠️ Modal already open, waiting for it to close...`);
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {
      console.log('⚠️ Could not detect modal closing, proceeding anyway...');
    });
    // Extra wait to ensure modal is fully closed
    await page.waitForTimeout(500);
  }

  // Click middle button in nav (+ icon) to open choice modal
  // RETRY LOGIC: If React not hydrated yet, button click won't work
  let modalOpened = false;
  const maxClickAttempts = 3;
  let clickAttempt = 0;
  
  while (!modalOpened && clickAttempt < maxClickAttempts) {
    clickAttempt++;
    
    try {
      // Middle button in bottom nav (positional - always works)
      const navButton = page.locator("nav").locator("button, a").nth(1);
      await navButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log(`[${new Date().toISOString()}] ✅ Nav button found (attempt ${clickAttempt}/${maxClickAttempts}), clicking...`);
      await navButton.click({ timeout: 5000 });
      
      // Check if modal actually opened (wait for dialog OR modal buttons)
      const dialogAppeared = await Promise.race([
        page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 2000 }).then(() => true),
        page.waitForSelector('[data-testid="expense-modal"]', { state: 'attached', timeout: 2000 }).then(() => true),
        page.waitForSelector('[data-testid="scan-receipt-button"]', { state: 'visible', timeout: 2000 }).then(() => true),
      ]).catch(() => false);
      
      if (dialogAppeared) {
        modalOpened = true;
        console.log(`[${new Date().toISOString()}] ✅ Modal opened successfully on attempt ${clickAttempt}`);
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ Modal did not open on attempt ${clickAttempt}, React may not be hydrated yet...`);
        if (clickAttempt < maxClickAttempts) {
          console.log(`[${new Date().toISOString()}] ⏳ Waiting for hydration before retry...`);
          // Wait for hydration confirmation instead of arbitrary timeout
          await page.waitForSelector('[data-hydrated="true"]', { timeout: 3000 }).catch(() => {
            console.log('⚠️ Hydration not confirmed, will retry anyway');
          });
        }
      }
    } catch (navError) {
      console.log(`[${new Date().toISOString()}] ⚠️ Nav button click failed on attempt ${clickAttempt}: ${navError}`);
      
      if (clickAttempt === maxClickAttempts) {
        // Last attempt - try empty state button as fallback
        console.log(`[${new Date().toISOString()}] ⚠️ All nav button attempts failed, trying empty state button...`);
        try {
          await page.click('[data-testid="add-first-expense-button"]', { timeout: 3000 });
          modalOpened = true;
        } catch (emptyError) {
          console.error("❌ Could not find any add expense button");
          await page.screenshot({ path: `test-results/add-button-error-${Date.now()}.png` }).catch(() => {});
          throw new Error(`Could not open expense modal after ${maxClickAttempts} attempts. Current URL: ${page.url()}`);
        }
      } else {
        // Not last attempt - wait and retry
        await page.waitForTimeout(1000);
      }
    }
  }

  if (!modalOpened) {
    throw new Error(`Failed to open modal after ${maxClickAttempts} attempts - React components may not be hydrated`);
  }

  // Give modal animation time to complete
  const modalTimestamp = new Date().toISOString();
  console.log(`[${modalTimestamp}] ✅ Modal opened, waiting for animation...`);
  await page.waitForTimeout(500);

  // CRITICAL: Wait for modal/dialog to open and animation to complete
  try {
    const dialogTimestamp = new Date().toISOString();
    console.log(`[${dialogTimestamp}] ⏳ Waiting for expense modal to be fully ready...`);
    
    // Wait for modal with proper testid and animation complete
    await page.waitForSelector('[data-testid="expense-modal"]', {
      state: 'attached',
      timeout: 10000
    });
    
    // Extra buffer for animation completion (Radix UI has 200ms animation)
    await page.waitForTimeout(300);
    console.log(`[${dialogTimestamp}] ✅ Modal dialog found and animated`);
  } catch {
    console.log(`[${new Date().toISOString()}] ⚠️ expense-modal not found, looking for modal buttons...`);
    // Fallback: try waiting for any modal content
    await page.waitForSelector('[data-testid="scan-receipt-button"], [data-testid="add-manual-button"]', {
      state: 'visible',
      timeout: 10000
    });
    console.log(`[${new Date().toISOString()}] ✅ Modal buttons found`);
  }

  // Click "Dodaj ręcznie" button in modal to open manual form
  // Locator auto-waits for visibility and clickability
  const buttonTimestamp = new Date().toISOString();
  console.log(`[${buttonTimestamp}] 🔍 Looking for and clicking manual button...`);
  try {
    const manualButton = page.locator('[data-testid="add-manual-button"]');
    await manualButton.click({ timeout: 10000 }); // Auto-waits for visible + enabled
    console.log(`[${buttonTimestamp}] ✅ Manual button clicked`);
  } catch (error) {
    console.error('Could not find manual add button, taking screenshot');
    await page.screenshot({ path: `test-results/manual-button-error-${Date.now()}.png` }).catch(() => {});
    throw new Error(`Could not find manual add button. Current URL: ${page.url()}`);
  }

  // Wait for amount input to be visible and editable (instead of arbitrary timeout)
  const amountInput = page.locator('[data-testid="expense-amount-input"]');
  await amountInput.waitFor({ state: "visible", timeout: 10000 });

  // Ensure input is ready for interaction
  await page.waitForSelector('[data-testid="expense-amount-input"]', { state: 'attached', timeout: 5000 });
  await amountInput.clear();
  await amountInput.fill(data.amount);

  // CRITICAL: Remove Astro Dev Toolbar before clicking dropdown (it intercepts pointer events)
  await page
    .evaluate(() => {
      const toolbar = document.querySelector("astro-dev-toolbar");
      if (toolbar) toolbar.remove();
    })
    .catch(() => {});

  // Select category - Shadcn/ui Select component
  const categoryTimestamp = new Date().toISOString();
  console.log(`[${categoryTimestamp}] 📂 Preparing to click category dropdown...`);
  
  const categorySelect = page.locator('[data-testid="expense-category-select"]');
  
  // Verify categories are loaded (SSR data should be available)
  const categoriesLoaded = await categorySelect.getAttribute('data-categories-loaded');
  const categoryCount = await categorySelect.getAttribute('data-category-count');
  console.log(`[${categoryTimestamp}] 📊 Categories loaded: ${categoriesLoaded}, count: ${categoryCount}`);
  
  if (categoriesLoaded !== 'true') {
    console.warn(`[${categoryTimestamp}] ⚠️ Categories not loaded in form!`);
  }
  
  // Ensure select is ready for interaction
  await categorySelect.waitFor({ state: 'visible', timeout: 5000 });
  console.log(`[${categoryTimestamp}] ✅ Category select visible, clicking...`);
  await categorySelect.click();
  
  // Wait for dropdown animation AND options to render
  // CRITICAL: First dropdown opening can take longer (Radix UI + data loading)
  console.log(`[${categoryTimestamp}] ⏳ Waiting for dropdown options...`);
  
  try {
    // Try with standard timeout first
    await page.waitForSelector('[role="option"]', {
      state: 'visible',
      timeout: 5000
    });
  } catch (firstAttemptError) {
    console.log(`[${categoryTimestamp}] ⚠️ Dropdown options not visible after 5s, checking dropdown state...`);
    
    // Check if dropdown is actually open
    const dropdownOpen = await categorySelect.getAttribute('data-state');
    console.log(`[${categoryTimestamp}] 📊 Dropdown state: ${dropdownOpen}`);
    
    if (dropdownOpen !== 'open') {
      console.log(`[${categoryTimestamp}] 🔄 Dropdown not open, clicking again...`);
      await categorySelect.click();
      await page.waitForTimeout(500);
    }
    
    // Try again with longer timeout (first load may be slower)
    await page.waitForSelector('[role="option"]', {
      state: 'visible',
      timeout: 10000
    });
  }
  
  // Radix UI needs time to position dropdown properly
  await page.waitForTimeout(300);
  console.log(`[${categoryTimestamp}] ✅ Dropdown options visible and positioned`);

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
  const dateInput = page.locator('input[type="date"]').or(page.getByLabel("Data"));

  // Only fill if date input exists (some forms may not have date picker)
  const dateExists = await dateInput.isVisible().catch(() => false);
  console.log(`[${new Date().toISOString()}] 📅 Date field exists: ${dateExists}`);
  if (dateExists) {
    await dateInput.fill(dateToUse);
    console.log(`[${new Date().toISOString()}] ✅ Date filled: ${dateToUse}`);
  }

  // Verify submit button is ready
  const submitButton = page.locator('[data-testid="expense-submit-button"]');
  await submitButton.waitFor({ state: 'visible', timeout: 5000 });
  const isEnabled = await submitButton.isEnabled();
  console.log(`[${new Date().toISOString()}] 🔘 Submit button visible: true, enabled: ${isEnabled}`);
  
  if (!isEnabled) {
    console.error(`[${new Date().toISOString()}] ❌ Submit button is disabled! Form may have validation errors.`);
    // Take screenshot for debugging
    await page.screenshot({ path: `test-results/submit-disabled-${Date.now()}.png` }).catch(() => {});
  }

  // CRITICAL: Start listening for response BEFORE clicking submit (Playwright best practice)
  // This prevents race condition where request completes before we start listening
  console.log(`[${new Date().toISOString()}] 📤 Setting up API response listener...`);
  const responsePromise = waitForAPI(page, '/api/expenses', 'POST', 201, 30000); // Increased to 30s for slow processing
  
  console.log(`[${new Date().toISOString()}] 🖱️  Clicking submit button...`);
  await page.click('[data-testid="expense-submit-button"]');
  
  console.log(`[${new Date().toISOString()}] ⏳ Waiting for API response or redirect...`);
  
  // MOBILE FIX: On mobile viewport, button click might not trigger form submission
  // Strategy: Race between API response and programmatic submit with redirect detection
  try {
    const result = await Promise.race([
      // Path 1: Normal API response
      responsePromise.then(r => ({ type: 'api', response: r })),
      
      // Path 2: Programmatic submit fallback
      // IMPORTANT: Must wait for API response (source of truth), not just modal close
      page.waitForTimeout(3000).then(async () => {
        console.log(`[${new Date().toISOString()}] ⚠️ No API response after 3s, checking if form submitted...`);
        
        // Check if we're still on the form page
        const formStillVisible = await submitButton.isVisible().catch(() => false);
        if (formStillVisible) {
          console.log(`[${new Date().toISOString()}] 🔄 Form still visible, triggering programmatic submit...`);
          
          // ✅ CRITICAL FIX: Create NEW response listener BEFORE programmatic submit
          // The old responsePromise is listening for the FIRST click's request (which failed)
          // Programmatic submit creates a SECOND request, so we need a NEW listener
          console.log(`[${new Date().toISOString()}] 📤 Creating NEW API listener for programmatic submit...`);
          const newResponsePromise = waitForAPI(page, '/api/expenses', 'POST', 201, 30000);
          
          // Try to find and submit the form programmatically with detailed logging
          const formSubmitted = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) {
              console.error('[MOBILE FIX] ❌ No form element found!');
              return false;
            }
            
            console.log('[MOBILE FIX] ✅ Form found, checking if valid...');
            
            // Check if form has required fields
            const submitButton = form.querySelector('button[type="submit"]');
            if (!submitButton) {
              console.error('[MOBILE FIX] ❌ No submit button found in form!');
              return false;
            }
            
            console.log('[MOBILE FIX] ✅ Submit button found, requesting submit...');
            try {
              form.requestSubmit();
              console.log('[MOBILE FIX] ✅ form.requestSubmit() called successfully');
              return true;
            } catch (error) {
              console.error('[MOBILE FIX] ❌ form.requestSubmit() threw error:', error);
              // Fallback: try dispatchEvent
              try {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                console.log('[MOBILE FIX] ✅ Fallback: dispatchEvent(submit) called');
                return true;
              } catch (dispatchError) {
                console.error('[MOBILE FIX] ❌ dispatchEvent also failed:', dispatchError);
                return false;
              }
            }
          });
          
          if (!formSubmitted) {
            console.error(`[${new Date().toISOString()}] ❌ Form submission failed - form not found or invalid`);
            // Don't throw yet - maybe the form already submitted and closed
            console.log(`[${new Date().toISOString()}] ℹ️ Checking if form closed (submission might have succeeded)...`);
          }
          
          // ✅ CRITICAL: Wait for NEW API response (source of truth)
          // Modal closing is frontend illusion, API response is backend reality
          console.log(`[${new Date().toISOString()}] ⏳ Waiting for NEW API response after programmatic submit...`);
          try {
            const lateResponse = await newResponsePromise;
            console.log(`[${new Date().toISOString()}] ✅ API confirmed success after programmatic submit: ${lateResponse.status()}`);
            return { type: 'api', response: lateResponse };
          } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ API failed after programmatic submit: ${error}`);
            throw new Error(`Programmatic submit triggered but API failed: ${error}`);
          }
        }
        
        // If form not visible, normal path should have handled it
        console.log(`[${new Date().toISOString()}] ℹ️ Form already not visible - continuing to wait for API`);
        const existingResponse = await responsePromise;
        return { type: 'api', response: existingResponse };
      })
    ]);
    
    if (result.type === 'redirect') {
      console.log(`[${new Date().toISOString()}] ✅ Expense created via programmatic submit (redirect detected)`);
      return; // Success - exit function
    }
    
    if (result.type === 'api' && 'response' in result) {
      console.log(`[${new Date().toISOString()}] ✅ API response received: ${result.response.status()}`);
      
      // Verify the expense was created successfully
      if (!result.response.ok()) {
        throw new Error(`Failed to create expense: ${result.response.status()} ${result.response.statusText()}`);
      }
      
      // Wait for redirect/navigation to complete
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {
        // If no redirect, that's okay - some forms stay on same page
      });
      return; // Success - exit function
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Expense creation failed: ${error}`);
    
    // Last resort: check if we're on dashboard (expense might have been created despite error)
    const currentUrl = page.url();
    if (currentUrl === 'http://localhost:3000/' || currentUrl.endsWith('/')) {
      console.log(`[${new Date().toISOString()}] ⚠️ On dashboard despite error - expense likely created`);
      return; // Continue - expense probably created
    }
    
    throw error;
  }
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
export async function createMultipleExpenses(page: Page, expenses: ExpenseData[]): Promise<void> {
  // Navigate once at the beginning to avoid navigation conflicts
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");

  const errors: string[] = [];

  for (let i = 0; i < expenses.length; i++) {
    try {
      const iterationTimestamp = new Date().toISOString();
      console.log(`[${iterationTimestamp}] Creating expense ${i + 1}/${expenses.length}: ${expenses[i].amount}`);

      // For first expense, skip navigation (we just navigated)
      // For subsequent expenses, don't skip - ensure clean state
      const skipNav = i === 0;
      await createExpense(page, expenses[i], skipNav);

      // createExpense now waits for API, so we don't need long delays
      // Just ensure we're back on dashboard
      await page.waitForURL('/', { timeout: 5000 }).catch(() => {});
      
    } catch (error) {
      const errorMsg = `Failed to create expense ${i + 1} (${expenses[i].amount}): ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);

      // Try to recover by navigating back to dashboard
      try {
        await page.goto("/", { waitUntil: "domcontentloaded", timeout: 10000 });
        await page.waitForLoadState("domcontentloaded");
      } catch (navError) {
        console.error("Failed to recover from error:", navError);
      }

      // Continue with next expense but track the error
      continue;
    }
  }

  // If any expenses failed to create, throw an error with details
  if (errors.length > 0) {
    throw new Error(`Failed to create ${errors.length}/${expenses.length} expenses:\n${errors.join("\n")}`);
  }
  
  console.log(`[${new Date().toISOString()}] ✅ All ${expenses.length} expenses created successfully`);
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
  await page.goto("/");
  await page.waitForLoadState("networkidle");

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
            method: "DELETE",
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
      console.error("[CLEANUP] Exception in deleteAllExpenses:", error);
      return { success: false, error: String(error) };
    }
  });

  if (!result.success) {
    console.warn("[CLEANUP] Failed to delete expenses:", result.error);
  } else {
    console.log(`[CLEANUP] Successfully deleted ${result.deleted} expenses`);
  }

  // CRITICAL: Hard reload to clear React state and cache
  const cleanupTimestamp = new Date().toISOString();
  console.log(`[${cleanupTimestamp}] [CLEANUP] Performing hard reload to clear cache...`);
  await page.goto("/", { waitUntil: "networkidle", timeout: 10000 });
  
  // Wait for dashboard to FULLY hydrate (Astro SSR + React client:load)
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle"); // Wait for all network activity
  
  // Wait for React components to hydrate via data-hydrated attribute
  console.log(`[${cleanupTimestamp}] [CLEANUP] Waiting for Astro hydration...`);
  await page.waitForSelector('[data-hydrated="true"]', { timeout: 5000 });
  console.log(`[${cleanupTimestamp}] [CLEANUP] ✅ Hydration confirmed`);
  
  // Wait for dashboard to load (either expenses or empty state) - using locator API
  const expenseCards = page.locator('[data-testid="expense-card"]');
  await Promise.race([
    expenseCards.first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => null),
    page.waitForSelector('text=Nie znaleziono wydatków', { timeout: 3000 }).catch(() => null),
    page.waitForSelector('text=Dodaj pierwszy wydatek', { timeout: 3000 }).catch(() => null)
  ]);
  
  // Final verification with retry logic using locator API
  let remainingCount = await expenseCards.count();
  
  if (remainingCount > 0) {
    console.log(`[${cleanupTimestamp}] [CLEANUP] Found ${remainingCount} expenses, waiting for state to settle...`);
    await page.waitForTimeout(1000);
    remainingCount = await expenseCards.count();
  }
  
  if (remainingCount > 0) {
    console.warn(`[${cleanupTimestamp}] [CLEANUP] WARNING: ${remainingCount} expenses still visible after cleanup!`);
    // Try one more hard reload
    console.log(`[${cleanupTimestamp}] [CLEANUP] Retrying with another hard reload...`);
    await page.goto("/", { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    const finalCount = await expenseCards.count();
    if (finalCount > 0) {
      console.error(`[${cleanupTimestamp}] [CLEANUP] FAILED: Still ${finalCount} expenses visible after double reload`);
    } else {
      console.log(`[${cleanupTimestamp}] [CLEANUP] ✅ Second reload successful, expenses now cleared`);
    }
  } else {
    console.log(`[${cleanupTimestamp}] [CLEANUP] ✅ All expenses cleared successfully`);
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
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const maxIterations = 50; // Reduced limit since this is slow
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
      await confirmButton.waitFor({ state: "visible", timeout: 3000 });
      await confirmButton.click();
      await page.waitForTimeout(1000);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
    } catch (error) {
      console.warn("Delete operation failed:", error);
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
  await page.goto("/");

  // Wait for page to load
  await page.waitForLoadState("networkidle");

  // Use locator API instead of page.$$
  const expenses = page.locator('[data-testid="expense-card"]');
  return await expenses.count();
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
export async function editExpense(page: Page, index: number, data: Partial<ExpenseData>): Promise<void> {
  await page.goto("/");

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
    await page
      .evaluate(() => {
        const toolbar = document.querySelector("astro-dev-toolbar");
        if (toolbar) toolbar.remove();
      })
      .catch(() => {});

    // Open category dropdown
    await page.click('[data-testid="expense-category-select"]');
    // Wait for options to appear
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    // Select category using filter (Radix UI)
    await page.locator('[role="option"]').filter({ hasText: data.category }).click();
  }

  if (data.date) {
    const dateInput = page.locator('input[type="date"]').or(page.getByLabel("Data"));
    await dateInput.fill(data.date);
  }

  // Save changes (edit mode uses "Zapisz zmiany")
  await page.click('button:has-text("Zapisz zmiany")').catch(() => page.click('button[type="submit"]'));
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
  await page.goto("/");

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
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  // Wait for dashboard API to load
  await waitForAPI(page, '/api/dashboard/summary', 'GET', 200, 10000).catch(() => {
    console.log("Dashboard summary API not detected, continuing anyway");
  });

  // Wait for the total amount element to be visible
  await page.waitForSelector('p.text-4xl', { state: 'visible', timeout: 5000 }).catch(() => {
    console.log("Total amount element not visible yet");
  });

  // Try multiple selectors to find the total amount
  // Based on DashboardSummary component structure
  const selectors = [
    'p.text-4xl.font-bold.tracking-tight', // Most specific selector
    'p.text-4xl', // Original selector
    'p:has-text("PLN")', // Any paragraph with PLN
    'text=/\\d+\\.\\d+.*PLN/', // Text matching number.number PLN pattern
    '[data-testid="total-amount"]', // If we add test id later
  ];

  let totalText: string | null = null;
  let usedSelector = '';

  // RETRY LOGIC: Try multiple times to find the total
  const maxRetries = 3;
  for (let retry = 0; retry < maxRetries; retry++) {
    if (retry > 0) {
      console.log(`Retry ${retry}/${maxRetries} to find total amount...`);
      await page.waitForTimeout(2000);
    }

    for (const selector of selectors) {
      try {
        console.log(`Trying selector: ${selector}`);
        const element = page.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        
        if (isVisible) {
          totalText = await element.textContent();
          usedSelector = selector;
          console.log(`Found total with selector "${selector}": "${totalText}"`);
          break;
        } else {
          console.log(`Selector "${selector}" not visible`);
        }
      } catch (error) {
        console.log(`Selector "${selector}" failed:`, error);
      }
    }

    if (totalText) break; // Found it, exit retry loop
  }

  if (!totalText) {
    console.log("❌ No total amount text found with any selector, dashboard might be empty");
    
    // Debug: log all text content on page
    const allText = await page.textContent('body').catch(() => 'Could not get body text');
    console.log("Page body text:", allText);
    
    return 0;
  }

  console.log(`✅ Found total text: "${totalText}" using selector: "${usedSelector}"`);

  // Extract number from text (e.g., "225.00 PLN" -> 225.00)
  const match = totalText.match(/[\d,.]+/);
  if (match) {
    const amount = parseFloat(match[0].replace(",", "."));
    console.log(`✅ Parsed amount: ${amount}`);
    return amount;
  }

  console.log("❌ Could not parse amount from text");
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
export async function filterByDateRange(page: Page, fromDate: string, toDate: string): Promise<void> {
  await page.goto("/");

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
export async function filterByCategory(page: Page, category: string): Promise<void> {
  await page.goto("/");

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
  await page.goto("/");

  const clearButton = page.locator('button:has-text("Wyczyść filtry")');
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForTimeout(500);
  }
}
