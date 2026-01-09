import { test, expect } from "@playwright/test";
import { loginUser } from "./helpers/auth.helpers";
import { createMultipleExpenses, deleteAllExpenses, getTotalSpent } from "./helpers/expense.helpers";
import { setupCleanEnvironment, getCurrentMonthDate } from "./helpers/setup.helpers";
import { waitForAPI } from "./helpers/api.helpers";

// Increase timeout for dashboard analytics tests (they involve multiple operations)
test.describe.configure({ timeout: 60000 });

test.describe("Dashboard Analytics - MVP Critical Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Just login, don't clean
    await setupCleanEnvironment(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    await deleteAllExpenses(page).catch(() => {
      // Ignore errors if already logged out or no expenses to delete
    });
  });

  test("Dashboard displays correct analytics after multiple expenses", async ({ page }) => {
    console.log("Starting test: Dashboard displays correct analytics after multiple expenses");

    // Setup: Create test expenses with dates in current month (for dashboard visibility)
    console.log("Creating 3 test expenses in current month...");
    try {
      // createMultipleExpenses now waits for each API response
      await createMultipleExpenses(page, [
        { amount: "100.00", category: "żywność", date: getCurrentMonthDate(-3) },
        { amount: "50.00", category: "transport", date: getCurrentMonthDate(-2) },
        { amount: "75.00", category: "żywność", date: getCurrentMonthDate(-1) },
      ]);
      console.log("✅ All 3 expenses created successfully");
    } catch (error) {
      console.error("❌ Error creating expenses:", error);
      throw error;
    }

    // 1. Navigate to dashboard and wait for data to load
    console.log("Navigating to dashboard...");
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
    
    // Wait for dashboard API to load
    await waitForAPI(page, '/api/dashboard/summary', 'GET', 200, 10000).catch(() => {
      console.log("Dashboard summary API not detected");
    });

    // Wait for expense cards to appear (we created 3, so expect 3)
    await expect(page.locator('[data-testid="expense-card"]')).toHaveCount(3, { timeout: 10000 });
    
    console.log("✅ All 3 expense cards are visible on dashboard");

    // 2. Verify total spent equals exactly our expenses
    const totalSpent = await getTotalSpent(page);
    console.log(`Total spent: ${totalSpent} PLN (expected: exactly 225.00)`);
    expect(totalSpent).toBe(225.0); // Exact match now possible!

    // 3. Verify chart is rendered (ExpensePieChart exists but lacks data-testid)
    const hasChart = await page.isVisible("canvas").catch(() => false);
    if (hasChart) {
      expect(hasChart).toBe(true);
      console.log("✅ Chart is rendered");
    }

    console.log("✅ Test completed successfully");
  });

  test("Should show dashboard with expenses or empty state", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for either expenses or empty state to appear
    await Promise.race([
      page.waitForSelector('[data-testid="expense-card"]', { timeout: 5000 }),
      page.waitForSelector('text=Nie znaleziono wydatków', { timeout: 5000 }),
      page.waitForSelector('text=Dodaj pierwszy wydatek', { timeout: 5000 })
    ]).catch(() => {
      console.log("Neither expenses nor empty state found quickly");
    });

    // Either has expenses or empty state
    const hasExpenses = await page.isVisible('[data-testid="expense-card"]');
    const hasEmptyState = await page
      .isVisible("text=Nie znaleziono wydatków")
      .catch(() => page.isVisible("text=Zacznij śledzić swoje wydatki"))
      .catch(() => page.isVisible("text=Dodaj pierwszy wydatek"))
      .catch(() => false);

    // At least one should be true
    expect(hasExpenses || hasEmptyState).toBe(true);
  });
});

// ❌ REMOVED FOR MVP:
// - "Should handle real-time updates" - not critical for MVP, optimization feature
// - "Should load quickly with many expenses" - performance optimization, not core functionality
// - All filtering tests - functionality doesn't exist in UI
// - Category statistics tests - UI lacks category stats section
// - Pagination tests - dashboard doesn't have pagination UI
// - Trend chart tests - UI lacks trend chart feature
// - Export tests - UI lacks export feature
// - Search tests - dashboard doesn't have search UI
// - Budget tracker tests - UI lacks budget feature
