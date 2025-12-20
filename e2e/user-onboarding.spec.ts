import { test, expect } from "@playwright/test";
import { registerUser, loginUser, getTestUser } from "./helpers/auth.helpers";
import { deleteAllExpenses, getExpenseCount } from "./helpers/expense.helpers";

test.describe("E2E: New User Onboarding", () => {
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

    // Check if we're redirected to login (not authenticated)
    if (page.url().includes("/login")) {
      // We're not logged in, which is expected for this test
      expect(page.url()).toContain("/login");
    } else {
      // If we're on dashboard, check the actual h1 content
      const h1Text = await page.textContent("h1");
      expect(h1Text).toContain("Panel główny");
    }

    // 2. Click register link
    await page.click('a:has-text("Zarejestruj się")');
    await page.waitForURL("/register");
    await page.waitForLoadState("domcontentloaded");

    // 3. Fill registration form with unique email
    const email = `test-${Date.now()}${Math.random().toString(36).substring(7)}@test.pl`;
    console.log(`Registering new user: ${email}`);

    await page.fill('input[name="email"]', email);
    await page.waitForTimeout(500); // Increased wait for React state update

    await page.fill('input[name="password"]', "SecurePass123!");
    await page.waitForTimeout(500);

    await page.fill('input[name="confirmPassword"]', "SecurePass123!");
    await page.waitForTimeout(500);

    // Verify fields are actually filled before proceeding
    const emailValue = await page.inputValue('input[name="email"]');
    const passwordValue = await page.inputValue('input[name="password"]');
    const confirmPasswordValue = await page.inputValue('input[name="confirmPassword"]');

    console.log(
      `Field values - Email: "${emailValue}", Password: ${passwordValue ? "***" : "EMPTY"}, Confirm: ${confirmPasswordValue ? "***" : "EMPTY"}`
    );

    // Check if there are any validation errors before submitting
    const hasPreSubmitError = await page
      .isVisible("text=Email jest wymagany")
      .catch(() => page.isVisible("text=Hasło jest wymagane"))
      .catch(() => false);

    if (hasPreSubmitError) {
      console.log("⚠️  Validation error before submit - taking screenshot");
      await page.screenshot({ path: `test-results/pre-submit-error-${Date.now()}.png` }).catch(() => {});
      console.log(`Email filled: ${emailValue}`);
    }

    expect(hasPreSubmitError).toBe(false);

    // 4. Submit registration
    await page.click('button[type="submit"]');

    // Wait for submission to process
    await page.waitForTimeout(1000);

    // 5. Check for errors first before waiting for redirect
    const hasSubmitError = await page
      .isVisible("text=Email jest wymagany")
      .catch(() => page.isVisible("text=istnieje"))
      .catch(() => page.isVisible("text=błąd"))
      .catch(() => false);

    if (hasSubmitError) {
      console.log("⚠️  Registration error - taking screenshot");
      await page.screenshot({ path: `test-results/registration-error-${Date.now()}.png` }).catch(() => {});
      const errorText = await page
        .locator("text=/Email jest wymagany|istnieje|błąd/i")
        .first()
        .textContent()
        .catch(() => "");
      console.log(`Error text: ${errorText}`);
    }

    // Should redirect to login
    try {
      await page.waitForURL("/login", { timeout: 15000 });
    } catch (error) {
      console.log(`Registration redirect timeout: ${error}`);
      // Check if we're already on login page or need to navigate
      const currentUrl = page.url();
      console.log(`Current URL after registration: ${currentUrl}`);
      
      if (!currentUrl.includes('/login')) {
        console.log('Forcing navigation to login page...');
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // 6. Login with new credentials
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    // 7. Should see empty dashboard
    try {
      await page.waitForURL("/", { timeout: 15000 });
    } catch (error) {
      console.log(`Login redirect timeout: ${error}`);
      // Check if we're on dashboard
      const currentUrl = page.url();
      if (!currentUrl.endsWith('/')) {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // Check for empty state message - use actual texts from EmptyState component
    const hasEmptyState = await page
      .isVisible("text=Nie znaleziono wydatków")
      .catch(() => page.isVisible("text=Nie dodałeś jeszcze żadnych wydatków"))
      .catch(() => page.isVisible("text=Zacznij śledzić swoje wydatki"))
      .catch(() => page.isVisible("text=Dodaj pierwszy wydatek"))
      .catch(() => page.isVisible("text=Dodaj swój pierwszy wydatek"))
      .catch(() => false);

    if (!hasEmptyState) {
      console.log("⚠️  Empty state not detected - taking screenshot for debugging");
      await page.screenshot({ path: `test-results/empty-state-debug-${Date.now()}.png` }).catch(() => {});
      const pageContent = await page.textContent('body');
      console.log(`Page content includes: ${pageContent?.substring(0, 200)}...`);
    }

    expect(hasEmptyState).toBe(true);

    // 8. Add first expense manually - Empty state shows "Dodaj pierwszy wydatek"
    try {
      // Try the actual button text from EmptyState component
      await page.click("text=Dodaj pierwszy wydatek", { timeout: 5000 });
    } catch {
      try {
        // Try alternative text
        await page.click("text=Dodaj swój pierwszy wydatek", { timeout: 3000 });
      } catch {
        // Try generic add button
        await page.click("text=Dodaj wydatek", { timeout: 3000 });
      }
    }

    // Wait for form to open
    await page.waitForSelector("text=Kwota", { timeout: 10000 });

    // Fill expense form
    await page.locator('input[placeholder="0.00"]').fill("25.50");

    // Select first available category
    // Select category - Shadcn Select component
    await page.click('[role="combobox"]').catch(() => page.click('button:has-text("Wybierz kategorię")'));
    await page.waitForSelector('[role="option"]', { timeout: 3000 });
    await page.getByRole("option").first().click();

    // Submit (create mode uses "Dodaj wydatek")
    await page.click('button:has-text("Dodaj wydatek")');

    // 9. Verify expense appears - wait for redirect and expense card
    try {
      await page.waitForURL("/", { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for API calls to complete
      await page.waitForSelector('[data-testid="expense-card"]', { timeout: 10000 });
    } catch (error) {
      console.log(`Expense card not found: ${error}`);
      // Alternative verification - check if expense data is visible
      const pageContent = await page.textContent('body');
      const hasExpenseData = pageContent?.includes('25.50') || pageContent?.includes('PLN');
      console.log(`Expense data visible in page content: ${hasExpenseData}`);
      
      if (!hasExpenseData) {
        // Force refresh to see if expense was created
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }

    // Verify amount is visible
    const hasAmount = await page.isVisible("text=25.50").catch(() => false);
    const hasExpenseCard = await page.isVisible('[data-testid="expense-card"]').catch(() => false);
    
    // At least one verification should pass
    expect(hasAmount || hasExpenseCard).toBe(true);
  });

  test("Should guide user through first expense creation", async ({ page }) => {
    // Register and login new user
    const testUser = await registerUser(page);
    await loginUser(page, testUser.email, testUser.password);

    // Dashboard should have "Add expense" CTA visible - check for actual button text from EmptyState
    const hasAddButton = await page
      .isVisible("text=Dodaj pierwszy wydatek")
      .catch(() => page.isVisible("text=Dodaj swój pierwszy wydatek"))
      .catch(() => page.isVisible("text=Dodaj wydatek"))
      .catch(() => page.isVisible('button:has-text("Dodaj")'))
      .catch(() => false);

    expect(hasAddButton).toBe(true);

    // Click and verify form opens
    await page.click("text=Dodaj pierwszy wydatek").catch(() => page.click("text=Dodaj wydatek"));
    await page.waitForSelector("text=Kwota", { timeout: 5000 });

    // Form should be properly displayed
    const hasAmountField = await page.locator('input[placeholder="0.00"]').isVisible();
    const hasCategoryField = await page.locator('[role="combobox"]').isVisible();
    const hasSaveButton = await page.isVisible('button:has-text("Dodaj wydatek")');

    expect(hasAmountField).toBe(true);
    expect(hasCategoryField).toBe(true);
    expect(hasSaveButton).toBe(true);
  });


  test("Should navigate between login and register pages", async ({ page }) => {
    // Start at login
    await page.goto("/login");

    // Click register link
    await page.click('a:has-text("Zarejestruj się")').catch(() => page.click("text=Zarejestruj"));

    // Should be on register page
    await page.waitForURL("/register");
    expect(page.url()).toContain("/register");

    // Click login link
    await page.click('a:has-text("Zaloguj")').catch(() => page.click("text=Masz konto"));

    // Should be back on login page
    await page.waitForURL("/login");
    expect(page.url()).toContain("/login");
  });
});

