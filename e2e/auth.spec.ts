import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/pl';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title and form elements
    await expect(page.getByRole('heading', { name: /zaloguj/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zaloguj/i })).toBeVisible();
  });

  test('should display registration page correctly', async ({ page }) => {
    await page.goto('/register');
    
    // Check page title and form elements
    await expect(page.getByRole('heading', { name: /zarejestruj/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^hasło$/i)).toBeVisible();
    await expect(page.getByLabel(/potwierdź hasło/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /zarejestruj/i })).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    
    // Submit empty form
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check for validation errors
    await expect(page.getByText(/email.*required/i)).toBeVisible();
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    
    // Fill with invalid email
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/hasło/i).fill('password123');
    await page.getByRole('button', { name: /zaloguj/i }).click();
    
    // Check for email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should navigate from login to registration page', async ({ page }) => {
    await page.goto('/login');
    
    // Click on register link
    await page.getByRole('link', { name: /zarejestruj/i }).click();
    
    // Should be on register page
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: /zarejestruj/i })).toBeVisible();
  });

  test('should navigate from registration to login page', async ({ page }) => {
    await page.goto('/register');
    
    // Click on login link
    await page.getByRole('link', { name: /zaloguj/i }).click();
    
    // Should be on login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /zaloguj/i })).toBeVisible();
  });

  test('should show error for mismatched passwords on registration', async ({ page }) => {
    await page.goto('/register');
    
    const email = faker.internet.email();
    
    // Fill form with mismatched passwords
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^hasło$/i).fill('password123');
    await page.getByLabel(/potwierdź hasło/i).fill('different-password');
    await page.getByRole('button', { name: /zarejestruj/i }).click();
    
    // Check for password mismatch error
    await expect(page.getByText(/hasła.*nie pasują/i)).toBeVisible();
  });

  test('should redirect authenticated user from login page to dashboard', async ({ page }) => {
    // This test assumes you have a way to set up authenticated state
    // For now, it's a placeholder that demonstrates the expected behavior
    
    // TODO: Implement authentication setup for E2E tests
    // Example: await setupAuthenticatedSession(page);
    
    // await page.goto('/login');
    // await expect(page).toHaveURL('/');
  });

  test('should protect dashboard route and redirect to login', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login Form Validation', () => {
  test('should accept valid email formats', async ({ page }) => {
    await page.goto('/login');
    
    const validEmails = [
      'user@example.com',
      'test.user@domain.co.uk',
      'user+tag@example.com',
    ];
    
    for (const email of validEmails) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/hasło/i).fill('password123');
      
      // No validation error should be visible for valid emails
      const emailError = page.getByText(/valid email/i);
      await expect(emailError).not.toBeVisible();
      
      // Clear for next iteration
      await page.getByLabel(/email/i).clear();
    }
  });

  test('should reject invalid email formats', async ({ page }) => {
    await page.goto('/login');
    
    const invalidEmails = [
      'invalid',
      'user@',
      '@example.com',
      'user@domain',
    ];
    
    for (const email of invalidEmails) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/hasło/i).fill('password123');
      await page.getByRole('button', { name: /zaloguj/i }).click();
      
      // Validation error should be visible
      await expect(page.getByText(/valid email/i)).toBeVisible();
      
      // Clear for next iteration
      await page.getByLabel(/email/i).clear();
    }
  });
});