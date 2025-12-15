import type { Page } from "@playwright/test";
import type { ExpenseData } from "./expense.helpers";
import { createMultipleExpenses, deleteAllExpenses } from "./expense.helpers";
import { loginUser, getTestUser, type TestUser } from "./auth.helpers";

/**
 * Complete test user with expenses
 */
export interface TestUserWithExpenses {
  user: TestUser;
  expenses: ExpenseData[];
}

/**
 * Create test user with expenses via UI
 * Note: This uses UI interactions for expense creation
 * For faster setup in real scenarios, consider using API directly
 *
 * @param page - Playwright Page object
 * @param expenses - Array of expense data to create
 * @returns Test user object with created expenses
 *
 * @example
 * ```typescript
 * const { user, expenses } = await createTestUserWithExpenses(page, [
 *   { amount: '100.00', category: 'żywność', date: '2024-01-15' },
 *   { amount: '50.00', category: 'transport', date: '2024-01-16' }
 * ]);
 * ```
 */
export async function createTestUserWithExpenses(
  page: Page,
  expenses: {
    amount: number | string;
    category: string;
    date: string;
  }[]
): Promise<TestUserWithExpenses> {
  // Use existing test user from .env.test
  const testUser = getTestUser();

  // Login
  await loginUser(page, testUser.email, testUser.password);

  // Clean existing expenses
  await deleteAllExpenses(page);

  // Create new expenses
  const expenseData: ExpenseData[] = expenses.map((e) => ({
    amount: typeof e.amount === "number" ? e.amount.toFixed(2) : e.amount,
    category: e.category,
    date: e.date,
  }));

  await createMultipleExpenses(page, expenseData);

  return {
    user: testUser,
    expenses: expenseData,
  };
}

/**
 * Setup clean test environment
 * - Login as test user
 * - Delete all existing expenses
 * - Navigate to dashboard
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await setupCleanEnvironment(page);
 * });
 * ```
 */
export async function setupCleanEnvironment(page: Page): Promise<void> {
  const testUser = getTestUser();

  try {
    // Login (with extended timeout for slower systems)
    await loginUser(page, testUser.email, testUser.password);

    // Wait a bit for session to stabilize
    await page.waitForTimeout(1000);

    // Clean up all expenses
    await deleteAllExpenses(page);

    // Navigate to dashboard and wait for load
    await page.goto("/", { waitUntil: "networkidle", timeout: 15000 });

    // Extra wait for any async operations
    await page.waitForTimeout(500);
  } catch (error) {
    console.error("Setup failed:", error);
    // Take screenshot for debugging
    await page
      .screenshot({
        path: `test-results/setup-failure-${Date.now()}.png`,
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  }
}

/**
 * Clean up test data (expenses only, keep user)
 *
 * @param page - Playwright Page object
 *
 * @example
 * ```typescript
 * test.afterEach(async ({ page }) => {
 *   await cleanupTestData(page);
 * });
 * ```
 */
export async function cleanupTestData(page: Page): Promise<void> {
  try {
    await deleteAllExpenses(page);
  } catch (error) {
    console.warn("Cleanup failed:", error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

/**
 * Wait for dashboard to load completely
 *
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds
 *
 * @example
 * ```typescript
 * await waitForDashboardLoad(page);
 * ```
 */
export async function waitForDashboardLoad(page: Page, timeout = 10000): Promise<void> {
  await page.goto("/");

  // Wait for network to be idle
  await page.waitForLoadState("networkidle", { timeout });

  // Wait for main content to appear
  await page
    .waitForSelector('[data-testid="dashboard-content"]', {
      timeout,
      state: "visible",
    })
    .catch(() => {
      // If dashboard-content doesn't exist, check for expense list or empty state
      return page.waitForSelector('[data-testid="expense-list"], text=Brak wydatków', {
        timeout: 5000,
      });
    });
}

/**
 * Setup test with specific number of expenses
 *
 * @param page - Playwright Page object
 * @param count - Number of expenses to create
 * @param baseAmount - Base amount (will be incremented)
 *
 * @example
 * ```typescript
 * await setupWithExpenses(page, 5, 50); // Creates 5 expenses: 50, 51, 52, 53, 54
 * ```
 */
export async function setupWithExpenses(page: Page, count: number, baseAmount = 50): Promise<void> {
  const testUser = getTestUser();
  await loginUser(page, testUser.email, testUser.password);
  await deleteAllExpenses(page);

  const expenses: ExpenseData[] = [];
  const categories = ["żywność", "transport", "media", "rozrywka", "zdrowie"];

  for (let i = 0; i < count; i++) {
    expenses.push({
      amount: (baseAmount + i).toFixed(2),
      category: categories[i % categories.length],
    });
  }

  await createMultipleExpenses(page, expenses);
}

/**
 * Get current date in YYYY-MM-DD format
 *
 * @param daysOffset - Number of days to offset from today (negative for past)
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * const today = getDateString(0);
 * const yesterday = getDateString(-1);
 * const nextWeek = getDateString(7);
 * ```
 */
export function getDateString(daysOffset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}

/**
 * Wait for specific time (wrapper for page.waitForTimeout with clearer name)
 *
 * @param milliseconds - Time to wait in milliseconds
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Take screenshot with timestamp (for debugging)
 *
 * @param page - Playwright Page object
 * @param name - Screenshot name (timestamp will be appended)
 *
 * @example
 * ```typescript
 * await takeDebugScreenshot(page, 'before-delete');
 * ```
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `test-results/debug-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Verify page has no console errors
 *
 * @param page - Playwright Page object
 * @returns Array of error messages (empty if no errors)
 *
 * @example
 * ```typescript
 * const errors = await getConsoleErrors(page);
 * expect(errors).toHaveLength(0);
 * ```
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Check if element exists (without throwing error)
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector or text
 * @returns true if element exists
 *
 * @example
 * ```typescript
 * const hasButton = await elementExists(page, 'button:has-text("Zapisz")');
 * ```
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch {
    return false;
  }
}

/**
 * Retry action with timeout
 *
 * @param action - Async function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delayMs - Delay between attempts in milliseconds
 *
 * @example
 * ```typescript
 * await retryAction(async () => {
 *   await page.click('button:has-text("Zapisz")');
 * }, 3, 1000);
 * ```
 */
export async function retryAction<T>(action: () => Promise<T>, maxAttempts = 3, delayMs = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  throw lastError || new Error("Retry action failed");
}
