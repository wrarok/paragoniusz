import { test, expect } from "@playwright/test";
import { faker } from "@faker-js/faker/locale/pl";

test.describe("Authentication Flow", () => {
  test("should display login page correctly", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Check that login form elements are present (pragmatic approach)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should display registration page correctly", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Check that registration form elements are present
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });


  test("should navigate from login to registration page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Click on register link
    await page.locator('a:has-text("Zarejestruj"), a:has-text("zarejestruj")').first().click();

    // Should be on register page with confirmPassword field (unique to registration)
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate from registration to login page", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    // Click on login link
    await page.locator('a:has-text("Zaloguj"), a:has-text("zaloguj")').first().click();

    // Should be on login page (no confirmPassword field - unique to login)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="confirmPassword"]')).not.toBeVisible();
  });


  test("should redirect authenticated user from login page to dashboard", async ({ page }) => {
    // This test assumes you have a way to set up authenticated state
    // For now, it's a placeholder that demonstrates the expected behavior
    // TODO: Implement authentication setup for E2E tests
    // Example: await setupAuthenticatedSession(page);
    // await page.goto('/login');
    // await expect(page).toHaveURL('/');
  });

  test("should protect dashboard route and redirect to login", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login page if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

