import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import type { APIContext } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/db/database.types';
import { DELETE } from '../../../src/pages/api/expenses/[id]';
import {
  createAuthenticatedClient,
  createClientWithUser,
  TEST_USER_B,
} from '../../helpers/test-auth';
import { TEST_USER } from '../../integration-setup';
import {
  createTestExpense,
  cleanTestDataWithClient,
  getCategoryByName,
} from '../../helpers/test-database';

describe('DELETE /api/expenses/[id] - Delete Expense', () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    // Suite-level authentication: create ONE session for all tests
    supabase = await createAuthenticatedClient();
  });

  afterEach(async () => {
    // Clean test data after each test using the shared authenticated client
    await cleanTestDataWithClient(supabase);
  });

  describe('Happy Path', () => {
    it('should successfully delete expense and return 204 No Content', async () => {
      // Arrange: Create test expense
      const category = await getCategoryByName('żywność');
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: '50.00',
        expense_date: '2024-01-15',
      });

      // Act: Delete expense
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: 'DELETE',
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await DELETE(context);

      // Assert
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();

      // Verify expense is deleted (should return null)
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense.id)
        .single();

      expect(data).toBeNull();
    });
  });

  describe('RLS Enforcement', () => {
    it('should return 404 when trying to delete another users expense', async () => {
      // Arrange: Create expense as TEST_USER
      const category = await getCategoryByName('żywność');
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: '50.00',
        expense_date: '2024-01-15',
      });

      // Create authenticated client for TEST_USER_B
      const supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);

      // Act: Try to delete as TEST_USER_B
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: 'DELETE',
        }),
        locals: { supabase: supabaseB, user: { id: 'user-b-id', email: TEST_USER_B.email } },
      } as unknown as APIContext;

      const response = await DELETE(context);
      const data = await response.json();

      // Assert: RLS should prevent deletion, returning 404
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('EXPENSE_NOT_FOUND');

      // Verify expense still exists for original user
      const { data: stillExists } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense.id)
        .single();

      expect(stillExists).not.toBeNull();
      expect(stillExists?.id).toBe(expense.id);

      // Cleanup: Remove TEST_USER_B data
      await cleanTestDataWithClient(supabaseB);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent expense ID', async () => {
      // Arrange
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      // Act
      const context = {
        params: { id: nonExistentId },
        request: new Request(`http://localhost/api/expenses/${nonExistentId}`, {
          method: 'DELETE',
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await DELETE(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('EXPENSE_NOT_FOUND');
      expect(data.error.message).toContain('not found');
    });

    it('should return 400 for invalid UUID format in path', async () => {
      // Arrange
      const invalidId = 'not-a-valid-uuid';

      // Act
      const context = {
        params: { id: invalidId },
        request: new Request(`http://localhost/api/expenses/${invalidId}`, {
          method: 'DELETE',
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await DELETE(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('Invalid expense ID format');
      expect(data.error.details.field).toBe('id');
      expect(data.error.details.provided).toBe(invalidId);
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 when trying to delete already deleted expense (idempotency)', async () => {
      // Arrange: Create and delete expense
      const category = await getCategoryByName('żywność');
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: '50.00',
        expense_date: '2024-01-15',
      });

      // First deletion
      const context1 = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: 'DELETE',
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response1 = await DELETE(context1);
      expect(response1.status).toBe(204);

      // Act: Try to delete again
      const context2 = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: 'DELETE',
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response2 = await DELETE(context2);
      const data = await response2.json();

      // Assert: Should return 404 (not idempotent - doesn't return 204 twice)
      expect(response2.status).toBe(404);
      expect(data.error.code).toBe('EXPENSE_NOT_FOUND');
    });
  });
});