import { test, expect } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth.helpers";
import { createExpense } from "./helpers/expense.helpers";

test.describe("Expense Management - MVP Critical Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await loginAsTestUser(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test("should successfully create expense with valid data", async ({ page }) => {
    // Use helper which handles the full flow
    await createExpense(page, { amount: "45.50" });

    // Verify expense appears on dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const expenseCards = await page.$$('[data-testid="expense-card"]');
    expect(expenseCards.length).toBeGreaterThan(0);
  });

  test("should display expense list when expenses exist", async ({ page }) => {
    // First create an expense so the list has content
    await createExpense(page, { amount: "25.50" });

    // Navigate to dashboard and wait for load
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should show expense cards (not necessarily a role="list")
    const expenseCards = await page.$$('[data-testid="expense-card"]');
    expect(expenseCards.length).toBeGreaterThan(0);

    // Verify the created expense is visible
    await expect(page.locator('[data-testid="expense-card"]').first()).toBeVisible();
  });

  test("should cancel expense deletion", async ({ page }) => {
    // Create at least one expense for deletion test
    await createExpense(page, { amount: "50.00" });
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const initialExpenseCount = await page.$$('[data-testid="expense-card"]').then((cards) => cards.length);

    // Click dropdown menu button using data-testid
    const firstCard = page.locator('[data-testid="expense-card"]').first();
    const menuButton = firstCard.locator('[data-testid="expense-menu-trigger"]');
    await menuButton.click();

    // Click "Usuń" using data-testid
    const deleteButton = page.locator('[data-testid="expense-delete-button"]');
    await deleteButton.click();

    // Cancel deletion
    await page.locator('button:has-text("Anuluj")').click();

    // Expense count should remain the same
    await page.waitForTimeout(500);
    const finalExpenseCount = await page.$$('[data-testid="expense-card"]').then((cards) => cards.length);
    expect(finalExpenseCount).toBe(initialExpenseCount);
  });

  test("should successfully delete expense", async ({ page }) => {
    // Create at least one expense for deletion test
    await createExpense(page, { amount: "50.00" });
    
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const initialCount = await page.$$('[data-testid="expense-card"]').then((cards) => cards.length);

    // Click dropdown menu button using data-testid
    const firstCard = page.locator('[data-testid="expense-card"]').first();
    const menuButton = firstCard.locator('[data-testid="expense-menu-trigger"]');
    await menuButton.click();

    // Click "Usuń" using data-testid
    const deleteButton = page.locator('[data-testid="expense-delete-button"]');
    await deleteButton.click();

    // Confirm deletion (second "Usuń" button in dialog)
    await page.locator('button:has-text("Usuń")').last().click();

    // Wait and verify deletion
    await page.waitForTimeout(1000);
    await page.goto("/");
    const finalCount = await page.$$('[data-testid="expense-card"]').then((cards) => cards.length);
    expect(finalCount).toBe(initialCount - 1);
  });
});

// ❌ REMOVED FOR MVP:
// - "should display expense creation form" - covered by create test
// - "should display empty state when no expenses" - covered by dashboard tests
// - All edit tests - editing functionality not critical for MVP
// - Filter tests - functionality doesn't exist in UI
