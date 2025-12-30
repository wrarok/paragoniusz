import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { setupE2EEnvironment } from "./e2e/playwright.env";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

// Setup feature flags environment for E2E tests
setupE2EEnvironment();

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",

  /* Global teardown - cleanup test users after all tests */
  globalTeardown: "./e2e/globalTeardown.ts",

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Single worker for local development */
  workers: process.env.CI ? 1 : 1,

  /* Reporter to use */
  reporter: "html",

  /* Global timeout for each test - increased for complex operations */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",

    /* Navigation timeout - increased for slower systems */
    navigationTimeout: 30000,

    /* Action timeout - increased for slower systems */
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Android mobile testing - Samsung Galaxy A35 5G (FAZA 4)
    {
      name: "mobile-android",
      use: {
        ...devices["Galaxy S9+"], // Base configuration
        viewport: { width: 1080, height: 2340 }, // Galaxy A35 5G screen resolution
        deviceScaleFactor: 2.5,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; SM-A356B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    },
  ],

  /*
   * webServer removed - start dev server manually before running tests:
   * npm run dev
   */
});
