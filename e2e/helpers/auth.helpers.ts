import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Test user interface matching .env.test configuration
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Set of test user emails created during test runs
 * Used for cleanup after tests complete
 */
export const createdTestUsers = new Set<string>();

/**
 * Whitelist of production users that should NEVER be deleted
 */
const PRODUCTION_USERS_WHITELIST = [
  'test@test.com',
  'test-b@test.com',
  'wra@acme.com',
];

/**
 * Check if email looks like a test user email
 * Test emails follow pattern: test-{timestamp}{random}@test.pl
 */
function isTestUserEmail(email: string): boolean {
  return /^test-\d+[a-z0-9]+@test\.pl$/i.test(email);
}

/**
 * Login user with credentials from .env.test
 * 
 * @param page - Playwright Page object
 * @param email - User email (defaults to E2E_USERNAME from .env.test)
 * @param password - User password (defaults to E2E_PASSWORD from .env.test)
 * 
 * @example
 * ```typescript
 * await loginUser(page);
 * await loginUser(page, 'custom@test.pl', 'CustomPass123!');
 * ```
 */
export async function loginUser(
  page: Page,
  email: string = process.env.E2E_USERNAME!,
  password: string = process.env.E2E_PASSWORD!
): Promise<void> {
  // Check if already on login page, if not navigate
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    await page.goto('/login', { waitUntil: 'networkidle' });
  } else {
    await page.waitForLoadState('networkidle');
  }
  
  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 });
  
  // Fill login form
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait a moment for submission
  await page.waitForTimeout(500);
  
  // Check for login error FIRST before waiting for navigation
  const loginError = await page.locator('text=/nieprawidłowy.*email.*hasło|błąd|invalid.*credentials/i').isVisible().catch(() => false);
  
  if (loginError) {
    const errorText = await page.locator('text=/nieprawidłowy.*email.*hasło|błąd|invalid.*credentials/i').textContent().catch(() => 'Unknown error');
    throw new Error(`❌ LOGIN FAILED: ${errorText}\n\n` +
      `🔍 Check your .env.test file:\n` +
      `   E2E_USERNAME=${email}\n` +
      `   E2E_PASSWORD=*** (hidden)\n\n` +
      `💡 Possible issues:\n` +
      `   1. Test user doesn't exist in database\n` +
      `   2. Password is incorrect\n` +
      `   3. User account is locked/disabled\n\n` +
      `✅ To fix:\n` +
      `   1. Verify credentials in .env.test\n` +
      `   2. Create test user in Supabase Auth if it doesn't exist\n` +
      `   3. Reset password if needed`
    );
  }
  
  // Wait for redirect to dashboard (more flexible approach with multiple strategies)
  try {
    // Strategy 1: Wait for URL change
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  } catch (error) {
    // Strategy 2: Check if we're already on dashboard (redirect might be instant)
    const url = page.url();
    if (url.includes('/login')) {
      // Still on login page - check for error message one more time
      const hasError = await page.isVisible('text=/nieprawidłowy|błąd|error/i').catch(() => false);
      if (hasError) {
        const errorText = await page.locator('text=/nieprawidłowy|błąd|error/i').first().textContent().catch(() => '');
        throw new Error(`Login failed with error: ${errorText}\n\nCheck credentials in .env.test:\nE2E_USERNAME=${email}`);
      }
      throw new Error(`Login timeout - still on login page after 15s. URL: ${url}`);
    }
  }
  
  // Additional wait for page to stabilize
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  
  // REMOVE Astro Dev Toolbar from DOM (has Shadow DOM, CSS won't work)
  await page.evaluate(() => {
    const toolbar = document.querySelector('astro-dev-toolbar');
    if (toolbar) {
      toolbar.remove();
    }
  }).catch(() => {
    // Ignore if toolbar doesn't exist
  });
}

/**
 * Register new user and return credentials
 *
 * @param page - Playwright Page object
 * @param email - User email (optional, auto-generated if not provided)
 * @param password - User password (optional, defaults to 'SecurePass123!')
 * @returns TestUser object with credentials
 *
 * @example
 * ```typescript
 * const user = await registerUser(page);
 * const user = await registerUser(page, 'myemail@test.pl', 'MyPass123!');
 * ```
 */
export async function registerUser(
  page: Page,
  email?: string,
  password?: string
): Promise<TestUser> {
  const testEmail = email || `test-${Date.now()}${Math.random().toString(36).substring(7)}@test.pl`;
  const testPassword = password || 'SecurePass123!';

  // Track created test user for cleanup (but NOT production users)
  if (!PRODUCTION_USERS_WHITELIST.includes(testEmail)) {
    createdTestUsers.add(testEmail);
  }

  await page.goto('/register');
  
  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 });
  
  // Fill registration form
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirmPassword"]', testPassword);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for either success redirect or error message
  await page.waitForTimeout(2000);
  
  // Check for validation errors first
  const hasValidationError = await page.isVisible('text=Email jest wymagany')
    .catch(() => page.isVisible('text=Wprowadź poprawny adres email'))
    .catch(() => page.isVisible('text=Hasło jest wymagane'))
    .catch(() => page.isVisible('text=Potwierdź swoje hasło'))
    .catch(() => page.isVisible('text=Hasła nie pasują'))
    .catch(() => false);
  
  if (hasValidationError) {
    const errorText = await page.locator('text=/Email jest wymagany|Wprowadź poprawny|Hasło jest wymagane|Potwierdź swoje|Hasła nie pasują/i').first().textContent().catch(() => 'Validation error');
    throw new Error(`❌ REGISTRATION VALIDATION FAILED: ${errorText}\n\nEmail: ${testEmail}\nPassword: ${testPassword}`);
  }
  
  // Check for general errors (e.g., user already exists)
  const hasGeneralError = await page.isVisible('text=istnieje')
    .catch(() => page.isVisible('text=zajęty'))
    .catch(() => page.isVisible('text=zarejestrowany'))
    .catch(() => page.isVisible('text=błąd'))
    .catch(() => false);
  
  if (hasGeneralError) {
    const errorText = await page.locator('text=/istnieje|zajęty|zarejestrowany|błąd/i').first().textContent().catch(() => 'General error');
    throw new Error(`❌ REGISTRATION FAILED: ${errorText}\n\nEmail: ${testEmail}\nThis might be expected if the user already exists.`);
  }
  
  // Should redirect to login page after successful registration
  try {
    await page.waitForURL('/login', { timeout: 8000 });
  } catch (error) {
    // Take screenshot for debugging
    await page.screenshot({ path: `test-results/registration-error-${Date.now()}.png` }).catch(() => {});
    throw new Error(`❌ REGISTRATION TIMEOUT: No redirect to login page\n\nEmail: ${testEmail}\nCurrent URL: ${page.url()}\n\nPossible issues:\n1. Registration form validation failed\n2. Server error during registration\n3. Network timeout`);
  }

  return {
    id: '', // Will be available after login
    email: testEmail,
    password: testPassword,
  };
}

/**
 * Logout current user
 * 
 * @param page - Playwright Page object
 * 
 * @example
 * ```typescript
 * await logoutUser(page);
 * ```
 */
export async function logoutUser(page: Page): Promise<void> {
  // Click user menu (adjust selector based on actual implementation)
  const userMenuVisible = await page.isVisible('[data-testid="user-menu"]');
  
  if (userMenuVisible) {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Wyloguj');
  } else {
    // Fallback: try direct logout link/button
    await page.click('text=Wyloguj');
  }
  
  // Wait for redirect to login (more flexible timeout)
  await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 15000 });
}

/**
 * Get test user credentials from environment variables
 * 
 * @returns TestUser object with credentials from .env.test
 * 
 * @example
 * ```typescript
 * const testUser = getTestUser();
 * await loginUser(page, testUser.email, testUser.password);
 * ```
 */
export function getTestUser(): TestUser {
  return {
    id: process.env.E2E_USERNAME_ID!,
    email: process.env.E2E_USERNAME!,
    password: process.env.E2E_PASSWORD!,
  };
}

/**
 * Check if user is currently authenticated
 * 
 * @param page - Playwright Page object
 * @returns true if authenticated, false otherwise
 * 
 * @example
 * ```typescript
 * const isAuth = await isAuthenticated(page);
 * if (!isAuth) {
 *   await loginUser(page);
 * }
 * ```
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/');
  
  // If redirected to login, user is not authenticated
  const currentUrl = page.url();
  return !currentUrl.includes('/login');
}

/**
 * Clear all cookies and local storage (force logout)
 * 
 * @param page - Playwright Page object
 * 
 * @example
 * ```typescript
 * await clearSession(page);
 * ```
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Login as test user and ensure clean state
 * Combines login + cleanup for common test setup
 * 
 * @param page - Playwright Page object
 * 
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await loginAsTestUser(page);
 * });
 * ```
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  const testUser = getTestUser();
  await loginUser(page, testUser.email, testUser.password);
}

/**
 * Delete test user from Supabase Auth
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment
 *
 * @param email - Email of user to delete
 *
 * @example
 * ```typescript
 * await deleteTestUser('test-123@test.pl');
 * ```
 */
export async function deleteTestUser(email: string): Promise<void> {
  // Safety check 1: NEVER delete whitelisted production users
  if (PRODUCTION_USERS_WHITELIST.includes(email)) {
    console.log(`⚠️  Skipping deletion of whitelisted user: ${email}`);
    return;
  }

  // Safety check 2: ONLY delete emails matching test pattern
  if (!isTestUserEmail(email)) {
    console.log(`⚠️  Skipping deletion - email doesn't match test pattern: ${email}`);
    return;
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`❌ Error listing users for deletion: ${listError.message}`);
      return;
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`ℹ️  User ${email} not found (already deleted or never existed)`);
      return;
    }

    // Delete user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error(`❌ Error deleting user ${email}: ${deleteError.message}`);
    } else {
      console.log(`✅ Deleted test user: ${email}`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete user ${email}:`, error);
  }
}

/**
 * Delete all test users created during test run
 * Should be called in global teardown
 *
 * @example
 * ```typescript
 * // In globalTeardown.ts
 * await cleanupTestUsers();
 * ```
 */
export async function cleanupTestUsers(): Promise<void> {
  console.log(`\n🧹 Cleaning up ${createdTestUsers.size} test users...`);
  
  if (createdTestUsers.size === 0) {
    console.log('ℹ️  No test users to clean up');
    return;
  }

  const deletionPromises = Array.from(createdTestUsers).map(email =>
    deleteTestUser(email)
  );

  await Promise.all(deletionPromises);
  
  console.log('✅ Test user cleanup complete\n');
  createdTestUsers.clear();
}