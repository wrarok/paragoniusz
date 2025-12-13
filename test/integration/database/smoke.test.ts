/**
 * Smoke Test - Integration Tests Setup Verification
 * 
 * This test verifies that the integration test environment is properly configured.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, getCategories, verifyCategoriesSetup } from '../../helpers/test-database';
import { verifyTestUserExists } from '../../helpers/test-auth';
import { TEST_USER } from '../../integration-setup';

describe('Integration Tests - Smoke Test', () => {
  describe('Environment Configuration', () => {
    it('should have all required environment variables', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
      expect(process.env.E2E_USERNAME).toBeDefined();
      expect(process.env.E2E_PASSWORD).toBeDefined();
      expect(process.env.E2E_USERNAME_ID).toBeDefined();
    });

    it('should have valid TEST_USER configuration', () => {
      expect(TEST_USER.email).toBe(process.env.E2E_USERNAME);
      expect(TEST_USER.password).toBe(process.env.E2E_PASSWORD);
      expect(TEST_USER.id).toBe(process.env.E2E_USERNAME_ID);
    });
  });

  describe('Database Connection', () => {
    it('should create Supabase client successfully', () => {
      const supabase = createTestClient();
      expect(supabase).toBeDefined();
    });

    it('should connect to database and fetch categories', async () => {
      const categories = await getCategories();
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should have all required categories in database', async () => {
      const categories = await verifyCategoriesSetup();
      expect(categories.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Test User Authentication', () => {
    it('should verify test user exists', async () => {
      const user = await verifyTestUserExists();
      expect(user).toBeDefined();
      expect(user.id).toBe(TEST_USER.id);
      expect(user.email).toBe(TEST_USER.email);
    });
  });
});