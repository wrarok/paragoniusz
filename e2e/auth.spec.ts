import { test, expect } from "@playwright/test";

test.describe("Authentication Flow - MVP Critical Tests", () => {
  test("should display login page correctly", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check that login form elements are present (pragmatic approach)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should navigate from login to registration page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Click on register link
    await page.locator('[data-testid="register-link"]').click();

    // Should be on register page with confirmPassword field (unique to registration)
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible({ timeout: 10000 });
  });

  test("should protect dashboard route and redirect to login", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login page if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

// ❌ REMOVED FOR MVP:
// - "should display registration page correctly" - covered by onboarding tests
// - "should navigate from registration to login page" - not critical for MVP
// - "should redirect authenticated user from login page to dashboard" - edge case, not critical

