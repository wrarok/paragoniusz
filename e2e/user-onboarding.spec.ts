import { test, expect } from "@playwright/test";
import { registerUser, loginUser } from "./helpers/auth.helpers";
import { deleteAllExpenses } from "./helpers/expense.helpers";

test.describe("User Onboarding - MVP Critical Tests", () => {
  test.afterEach(async ({ page }) => {
    // Cleanup test data after each test
    const { deleteAllExpenses } = await import("./helpers/expense.helpers");
    await deleteAllExpenses(page).catch(() => {});
  });

  test.afterAll(async () => {
    // Clean up test users created in this test file
    console.log("\n🧹 Cleaning up test users from user-onboarding tests...");
    const { cleanupTestUsers } = await import("./helpers/auth.helpers");
    await cleanupTestUsers().catch((error) => {
      console.error("❌ Failed to cleanup test users in afterAll:", error);
    });
  });

  test("Complete flow from registration to adding first expense", async ({ page }) => {
    // 1. Visit homepage
    await page.goto("/");
    
    // 2. Should redirect to login (or already be there)
    await page.waitForURL(/\/login/, { timeout: 10000 });
    
    // 3. Navigate to registration
    await page.click('a:has-text("Zarejestruj się")');
    await page.waitForURL("/register", { timeout: 10000 });
    
    // 4. Fill registration form with unique email
    const email = `test-${Date.now()}${Math.random().toString(36).substring(7)}@test.pl`;
    console.log(`Registering new user: ${email}`);
    
    // Fill email field and verify
    const emailInput = page.locator('input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email);
    
    // Fill password field and verify
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill("SecurePass123!");
    await expect(passwordInput).toHaveValue("SecurePass123!");
    
    // Fill confirm password field and verify
    const confirmInput = page.locator('input[name="confirmPassword"]');
    await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
    await confirmInput.fill("SecurePass123!");
    await expect(confirmInput).toHaveValue("SecurePass123!");
    
    // 5. Submit registration and wait for redirect to login
    await page.click('button[type="submit"]');
    await page.waitForURL("/login", {
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    
    // 6. Login with new credentials
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("SecurePass123!");
    await page.click('button[type="submit"]');
    
    // 7. Wait for dashboard to load
    await page.waitForURL("/", { timeout: 30000 });
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({ timeout: 10000 });
    
    // 8. Verify empty state is displayed
    await expect(page.locator('button:has-text("Dodaj pierwszy wydatek")')).toBeVisible({ timeout: 10000 });
    
    // 9. Click button to add first expense
    await page.locator('button:has-text("Dodaj pierwszy wydatek")').click();
    
    // 10. Wait for expense form to be ready
    const amountInput = page.locator('input[placeholder="0.00"]');
    await expect(amountInput).toBeVisible({ timeout: 10000 });
    await expect(amountInput).toBeEditable();
    await amountInput.fill("25.50");
    
    // 11. Select category
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
    await page.getByRole("option").first().click();
    
    // 12. Submit expense form
    await page.click('button:has-text("Dodaj wydatek")');
    
    // 13. Verify expense was created and appears on dashboard
    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="expense-card"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid="expense-card"]').first()).toContainText('25.50');
  });

  test("Should guide user through first expense creation", async ({ page }) => {
    // Register and login new user
    const testUser = await registerUser(page);
    await loginUser(page, testUser.email, testUser.password);

    // Wait for page to load and check for empty state button
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Dashboard should have "Add expense" CTA visible - check for actual button text from RecentExpensesList EmptyState
    const hasAddButton = await page.locator('button:has-text("Dodaj pierwszy wydatek")').isVisible().catch(() => false);
    expect(hasAddButton).toBe(true);

    // Click and verify form opens
    await page.locator('button:has-text("Dodaj pierwszy wydatek")').click();
    await page.waitForSelector("text=Kwota", { timeout: 5000 });

    // Form should be properly displayed
    const hasAmountField = await page.locator('input[placeholder="0.00"]').isVisible();
    const hasCategoryField = await page.locator('[role="combobox"]').isVisible();
    const hasSaveButton = await page.isVisible('button:has-text("Dodaj wydatek")');

    expect(hasAmountField).toBe(true);
    expect(hasCategoryField).toBe(true);
    expect(hasSaveButton).toBe(true);
  });
});

// ❌ REMOVED FOR MVP:
// - "Should navigate between login and register pages" - covered by auth tests, not critical for onboarding flow

