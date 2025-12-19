import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker/locale/pl";
import { loginAsTestUser } from "./helpers/auth.helpers";
import { createExpense } from "./helpers/expense.helpers";

// Helper to open expense form modal
async function openExpenseForm(page: any) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click middle button in nav (+ icon)
  await page.locator("nav").locator("button, a").nth(1).click();
  await page.waitForTimeout(500);

  // Click "Dodaj ręcznie"
  await page.click('button:has-text("Dodaj ręcznie")');
  await page.waitForTimeout(1000);
}

test.describe("Manual Expense Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    await loginAsTestUser(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test("should display expense creation form", async ({ page }) => {
    await openExpenseForm(page);

    // Check if form elements are visible (Shadcn UI components)
    await expect(page.locator('input[placeholder="0.00"]')).toBeVisible();
    await expect(page.locator('[role="combobox"]')).toBeVisible(); // Category selector
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
});

test.describe("Expense List Display", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test("should display empty state when no expenses", async ({ page }) => {
    // Navigate to dashboard (cleanup in afterEach ensures no expenses)
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for empty state message (using correct text from EmptyState component)
    const hasEmptyState = await page
      .isVisible("text=Nie znaleziono wydatków")
      .catch(() => page.isVisible("text=Zacznij śledzić swoje wydatki"))
      .catch(() => page.isVisible("text=Dodaj pierwszy wydatek"))
      .catch(() => false);

    expect(hasEmptyState).toBe(true);
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

  // Note: Date filter test removed - dashboard does not have filter UI
});

test.describe("Expense Edit and Delete", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Create at least one expense for editing/deleting tests
    await createExpense(page, { amount: "50.00" });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });


  test("should cancel expense deletion", async ({ page }) => {
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
