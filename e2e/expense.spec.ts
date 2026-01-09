import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth.helpers";
import { createExpense } from "./helpers/expense.helpers";

test.describe("Expense Management - MVP Critical Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate and ensure clean state before each test
    await loginAsTestUser(page);
    
    // CRITICAL: Clean up any existing expenses to ensure test isolation
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test("should successfully create expense with valid data", async ({ page }) => {
    // Use helper which handles the full flow (now waits for API)
    await createExpense(page, { amount: "45.50" });

    // Verify expense appears on dashboard
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    
    // Wait for expense cards to appear
    await expect(page.locator('[data-testid="expense-card"]')).toHaveCount(1, { timeout: 5000 });
  });

  test("should display expense list when expenses exist", async ({ page }) => {
    // First create an expense so the list has content (now waits for API)
    await createExpense(page, { amount: "25.50" });

    // Navigate to dashboard and wait for load
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for expense cards to appear and verify
    await expect(page.locator('[data-testid="expense-card"]')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('[data-testid="expense-card"]').first()).toBeVisible();
  });

  test("should cancel expense deletion", async ({ page }) => {
    // Create at least one expense for deletion test (now waits for API)
    await createExpense(page, { amount: "50.00" });
    
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    
    // Wait for expense card to be visible
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards).toHaveCount(1, { timeout: 5000 });

    const initialExpenseCount = await expenseCards.count();

    // Click dropdown menu button using data-testid
    const firstCard = expenseCards.first();
    const menuButton = firstCard.locator('[data-testid="expense-menu-trigger"]');
    await menuButton.click();

    // Click "Usuń" using data-testid (locator auto-waits)
    const deleteButton = page.locator('[data-testid="expense-delete-button"]');
    await deleteButton.click();

    // Cancel deletion using data-testid (locator auto-waits)
    const cancelButton = page.locator('[data-testid="alert-dialog-cancel"]');
    await cancelButton.click();

    // Expense count should remain the same
    await expect(expenseCards).toHaveCount(initialExpenseCount);
  });

  test("should successfully delete expense", async ({ page }) => {
    // Create at least one expense for deletion test (now waits for API)
    await createExpense(page, { amount: "50.00" });
    
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    
    // Wait for expense card to be visible
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards).toHaveCount(1, { timeout: 5000 });

    const initialCount = await expenseCards.count();
    
    if (initialCount !== 1) {
      console.error(`⚠️ Expected 1 expense card after creation, found ${initialCount}`);
      await page.screenshot({ path: `test-results/delete-test-unexpected-count-${Date.now()}.png` }).catch(() => {});
    }
    
    // Ensure we have at least one expense to delete
    expect(initialCount).toBeGreaterThan(0);

    // Click dropdown menu button using data-testid
    const firstCard = expenseCards.first();
    const menuButton = firstCard.locator('[data-testid="expense-menu-trigger"]');
    await menuButton.click();

    // Click "Usuń" using data-testid (locator auto-waits)
    const deleteButton = page.locator('[data-testid="expense-delete-button"]');
    await deleteButton.click();

    // Confirm deletion using data-testid (locator auto-waits)
    const confirmButton = page.locator('[data-testid="alert-dialog-action"]');
    await confirmButton.click();

    // Wait for card count to decrease using web-first assertion
    await expect(expenseCards).toHaveCount(initialCount - 1, { timeout: 5000 });
  });
});

// ❌ REMOVED FOR MVP:
// - "should display expense creation form" - covered by create test
// - "should display empty state when no expenses" - covered by dashboard tests
// - All edit tests - editing functionality not critical for MVP
// - Filter tests - functionality doesn't exist in UI
