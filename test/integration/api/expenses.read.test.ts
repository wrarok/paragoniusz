/**
 * API Integration Tests - GET /api/expenses & GET /api/expenses/[id]
 * 
 * Tests expense read operations:
 * - List expenses with pagination
 * - List expenses with filtering (date range, category)
 * - Get single expense by ID
 * - RLS enforcement (user isolation)
 * - Error handling (404, invalid params)
 * 
 * References:
 * - src/pages/api/expenses/index.ts (GET handler)
 * - src/pages/api/expenses/[id].ts (GET handler)
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as GET_LIST } from '../../../src/pages/api/expenses/index';
import { GET as GET_SINGLE } from '../../../src/pages/api/expenses/[id]';
import { createAuthenticatedClient, createClientWithUser, TEST_USER_B } from '../../helpers/test-auth';
import { cleanTestDataWithClient, getCategoryByName, createTestExpense } from '../../helpers/test-database';
import { TEST_USER } from '../../integration-setup';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/db/database.types';
import type { APIContext } from 'astro';

describe('GET /api/expenses - List Expenses', () => {
  let supabase: SupabaseClient<Database>;
  let categoryId: string;

  beforeAll(async () => {
    supabase = await createAuthenticatedClient();
    const category = await getCategoryByName('żywność');
    categoryId = category.id;
  });

  afterEach(async () => {
    await cleanTestDataWithClient(supabase);
  });

  afterAll(async () => {
    await cleanTestDataWithClient(supabase);
  });

  describe('Basic Read', () => {
    it('should return empty array for user with no expenses', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toEqual([]);
      expect(data.count).toBe(0);
      expect(data.total).toBe(0);
    });

    it('should return expenses with nested category data', async () => {
      // Create test expense
      await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '50.00',
        expense_date: '2024-01-15',
        user_id: TEST_USER.id,
      });

      const context = {
        request: new Request('http://localhost/api/expenses'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].category).toBeDefined();
      expect(data.data[0].category.name).toBe('żywność');
      expect(data.data[0].amount).toBe('50');
    });

    it('should return multiple expenses sorted by date descending (default)', async () => {
      // Create expenses with different dates
      await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '30.00',
        expense_date: '2024-01-10',
        user_id: TEST_USER.id,
      });

      await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '50.00',
        expense_date: '2024-01-20',
        user_id: TEST_USER.id,
      });

      await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '40.00',
        expense_date: '2024-01-15',
        user_id: TEST_USER.id,
      });

      const context = {
        request: new Request('http://localhost/api/expenses'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(3);
      
      // Should be sorted by date desc (newest first)
      expect(data.data[0].expense_date).toBe('2024-01-20');
      expect(data.data[1].expense_date).toBe('2024-01-15');
      expect(data.data[2].expense_date).toBe('2024-01-10');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      // Create 5 test expenses
      for (let i = 1; i <= 5; i++) {
        await createTestExpense(supabase, {
          category_id: categoryId,
          amount: `${i * 10}.00`,
          expense_date: `2024-01-${10 + i}`,
          user_id: TEST_USER.id,
        });
      }
    });

    it('should respect limit parameter', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?limit=2'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.total).toBe(5);
    });

    it('should respect offset parameter', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?limit=2&offset=2'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.total).toBe(5);
      
      // Should skip first 2 and return next 2
      expect(data.data[0].expense_date).toBe('2024-01-13');
      expect(data.data[1].expense_date).toBe('2024-01-12');
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      const transportCategory = await getCategoryByName('transport');
      
      // Create expenses with different dates and categories
      await createTestExpense(supabase, {
        category_id: categoryId, // żywność
        amount: '30.00',
        expense_date: '2024-01-10',
        user_id: TEST_USER.id,
      });

      await createTestExpense(supabase, {
        category_id: transportCategory.id,
        amount: '50.00',
        expense_date: '2024-01-20',
        user_id: TEST_USER.id,
      });

      await createTestExpense(supabase, {
        category_id: categoryId, // żywność
        amount: '40.00',
        expense_date: '2024-01-25',
        user_id: TEST_USER.id,
      });
    });

    it('should filter by date range (from_date)', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?from_date=2024-01-15'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      // Should not include 2024-01-10
      expect(data.data.every((e: any) => e.expense_date >= '2024-01-15')).toBe(true);
    });

    it('should filter by date range (to_date)', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?to_date=2024-01-20'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      // Should not include 2024-01-25
      expect(data.data.every((e: any) => e.expense_date <= '2024-01-20')).toBe(true);
    });

    it('should filter by date range (both from_date and to_date)', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?from_date=2024-01-15&to_date=2024-01-22'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].expense_date).toBe('2024-01-20');
    });

    it('should filter by category_id', async () => {
      const context = {
        request: new Request(`http://localhost/api/expenses?category_id=${categoryId}`),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(2); // Both żywność expenses
      expect(data.data.every((e: any) => e.category_id === categoryId)).toBe(true);
    });
  });

  describe('RLS Enforcement', () => {
    it('should NOT return other users expenses', async () => {
      // Create expense for TEST_USER
      await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '50.00',
        expense_date: '2024-01-15',
        user_id: TEST_USER.id,
      });

      // Create second user (TEST_USER_B) and their expense
      const supabaseB = await createClientWithUser(
        TEST_USER_B.email,
        TEST_USER_B.password,
      );

      await createTestExpense(supabaseB, {
        category_id: categoryId,
        amount: '100.00',
        expense_date: '2024-01-20',
        user_id: (await supabaseB.auth.getUser()).data.user!.id,
      });

      // Query as TEST_USER - should only see their expense
      const context = {
        request: new Request('http://localhost/api/expenses'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].amount).toBe('50');
      expect(data.data[0].user_id).toBe(TEST_USER.id);

      // Cleanup user B data
      await supabaseB
        .from('expenses')
        .delete()
        .eq('user_id', (await supabaseB.auth.getUser()).data.user!.id);
    });
  });

  describe('Validation Errors', () => {
    it('should reject invalid limit (negative)', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?limit=-1'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('should reject invalid category_id (not UUID)', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses?category_id=invalid'),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_LIST(context);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_INPUT');
    });
  });
});

describe('GET /api/expenses/[id] - Get Single Expense', () => {
  let supabase: SupabaseClient<Database>;
  let categoryId: string;
  let expenseId: string;

  beforeAll(async () => {
    supabase = await createAuthenticatedClient();
    const category = await getCategoryByName('żywność');
    categoryId = category.id;
  });

  afterEach(async () => {
    await cleanTestDataWithClient(supabase);
  });

  afterAll(async () => {
    await cleanTestDataWithClient(supabase);
  });

  describe('Happy Path', () => {
    it('should return expense by id with category data', async () => {
      // Create test expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '50.00',
        expense_date: '2024-01-15',
        user_id: TEST_USER.id,
      });

      const context = {
        request: new Request(`http://localhost/api/expenses/${expense.id}`),
        params: { id: expense.id },
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_SINGLE(context);

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.id).toBe(expense.id);
      expect(data.amount).toBe('50');
      expect(data.expense_date).toBe('2024-01-15');
      expect(data.category).toBeDefined();
      expect(data.category.name).toBe('żywność');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent expense', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const context = {
        request: new Request(`http://localhost/api/expenses/${fakeId}`),
        params: { id: fakeId },
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_SINGLE(context);

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error.code).toBe('EXPENSE_NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const context = {
        request: new Request('http://localhost/api/expenses/invalid-uuid'),
        params: { id: 'invalid-uuid' },
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await GET_SINGLE(context);

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.code).toBe('INVALID_INPUT');
      expect(data.error.message).toContain('UUID');
    });
  });

  describe('RLS Enforcement', () => {
    it('should return 404 when trying to access another users expense', async () => {
      // Create expense for TEST_USER
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '50.00',
        expense_date: '2024-01-15',
        user_id: TEST_USER.id,
      });

      // Create second user (TEST_USER_B)
      const supabaseB = await createClientWithUser(
        TEST_USER_B.email,
        TEST_USER_B.password,
      );

      const userB = (await supabaseB.auth.getUser()).data.user!;

      // Try to access TEST_USER's expense as User B
      const context = {
        request: new Request(`http://localhost/api/expenses/${expense.id}`),
        params: { id: expense.id },
        locals: {
          supabase: supabaseB,
          user: { id: userB.id, email: userB.email },
        },
      } as unknown as APIContext;

      const response = await GET_SINGLE(context);

      // RLS will make it appear as "not found" (404) instead of "forbidden" (403)
      // This is a security best practice - don't reveal existence of resources
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error.code).toBe('EXPENSE_NOT_FOUND');

      // Cleanup
      await supabaseB
        .from('expenses')
        .delete()
        .eq('user_id', userB.id);
    });
  });
});