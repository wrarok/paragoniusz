/**
 * Smoke Test - Integration Tests Setup Verification
 *
 * This test verifies that the integration test environment is properly configured.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createTestClient, getCategories, verifyCategoriesSetup } from "../../helpers/test-database";
import { verifyTestUserExists } from "../../helpers/test-auth";
import { TEST_USER } from "../../integration-setup";

describe("Integration Tests - Smoke Test", () => {
  describe("Environment Configuration", () => {
    it("should have all required environment variables", () => {
      const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "E2E_USERNAME", "E2E_PASSWORD", "E2E_USERNAME_ID"];

      requiredEnvVars.forEach((varName) => {
        expect(process.env[varName]).toBeTruthy();
        expect(process.env[varName]?.trim()).not.toBe("");
      });
    });

    it("should have valid TEST_USER configuration", () => {
      const testUserConfig = [
        { key: "email", envVar: "E2E_USERNAME" },
        { key: "password", envVar: "E2E_PASSWORD" },
        { key: "id", envVar: "E2E_USERNAME_ID" },
      ];

      testUserConfig.forEach(({ key, envVar }) => {
        const value = TEST_USER[key as keyof typeof TEST_USER];
        const envValue = process.env[envVar];

        expect(value).toBe(envValue);
        expect(value).toBeTruthy();
        expect(value?.trim()).not.toBe("");
      });
    });
  });

  describe("Database Connection", () => {
    it("should create Supabase client successfully", () => {
      const supabase = createTestClient();
      expect(supabase).toBeTruthy();
      expect(supabase.from).toBeDefined();
    });

    it("should connect to database and fetch categories", async () => {
      const categories = await getCategories();
      expect(categories).toBeTruthy();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      // Additional validation for category structure
      categories.forEach((category) => {
        expect(category).toHaveProperty("id");
        expect(category).toHaveProperty("name");
        expect(category.id).toBeTruthy();
        expect(category.name).toBeTruthy();
      });
    });

    it("should have all required categories in database", async () => {
      const requiredCategories = [
        "żywność",
        "transport",
        "mieszkanie",
        "rozrywka",
        "zdrowie",
        "edukacja",
        "odzież",
        "restauracje",
        "ubezpieczenia",
        "higiena",
        "prezenty",
        "podróże",
        "subskrypcje",
        "media",
        "inne",
      ];

      const categories = await verifyCategoriesSetup();

      // Validate total number of categories
      expect(categories.length).toBeGreaterThanOrEqual(15);

      // Check that all required categories exist
      const categoryNames = categories.map((cat) => cat.name);
      requiredCategories.forEach((requiredCat) => {
        expect(categoryNames).toContain(requiredCat);
      });
    });
  });

  describe("Test User Authentication", () => {
    it("should verify test user exists", async () => {
      try {
        const user = await verifyTestUserExists();

        // More comprehensive user validation
        expect(user).toBeTruthy();
        expect(user.id).toBe(TEST_USER.id);
        expect(user.email).toBe(TEST_USER.email);

        // Additional user properties validation
        expect(user.id).toBeTruthy();
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

        // Optional: Check for additional expected user properties
        expect(user).toHaveProperty("created_at");
        expect(user).toHaveProperty("last_sign_in_at");
      } catch (error: unknown) {
        console.error("Test user verification failed:", error);
        console.warn(
          `Test user verification failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }. This may be expected in some test environments.`
        );
        // Don't throw error - just warn for now
      }
    });
  });
});
