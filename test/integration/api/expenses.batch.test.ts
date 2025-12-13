import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import type { APIContext } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/db/database.types';
import { POST } from '../../../src/pages/api/expenses/batch';
import { createAuthenticatedClient } from '../../helpers/test-auth';
import { TEST_USER } from '../../integration-setup';
import { cleanTestDataWithClient, getCategoryByName } from '../../helpers/test-database';

describe('POST /api/expenses/batch - Batch Create Expenses', () => {
  let supabase: SupabaseClient<Database>;
  let foodCategoryId: string;
  let transportCategoryId: string;

  beforeAll(async () => {
    // Suite-level authentication: create ONE session for all tests
    supabase = await createAuthenticatedClient();

    // Get category IDs for tests
    const foodCategory = await getCategoryByName('żywność');
    const transportCategory = await getCategoryByName('transport');

    if (!foodCategory || !transportCategory) {
      throw new Error('Required test categories not found');
    }

    foodCategoryId = foodCategory.id;
    transportCategoryId = transportCategory.id;
  });

  afterEach(async () => {
    // Clean test data after each test using the shared authenticated client
    await cleanTestDataWithClient(supabase);
  });

  describe('Happy Path', () => {
    it('should create multiple expenses (3) in a batch', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
          {
            category_id: transportCategoryId,
            amount: '25.50',
            expense_date: '2024-01-16',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
          {
            category_id: foodCategoryId,
            amount: '100.00',
            expense_date: '2024-01-17',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.count).toBe(3);
      expect(data.data).toHaveLength(3);

      // Verify each expense
      expect(data.data[0].amount).toBe('50');
      expect(data.data[0].category.name).toBe('żywność');
      expect(data.data[1].amount).toBe('25.5');
      expect(data.data[1].category.name).toBe('transport');
      expect(data.data[2].amount).toBe('100');

      // Verify all have user_id
      data.data.forEach((expense: any) => {
        expect(expense.user_id).toBe(TEST_USER.id);
      });
    });

    it('should create single expense in batch', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '75.00',
            expense_date: '2024-01-20',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.count).toBe(1);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].amount).toBe('75');
    });

    it('should correctly set AI flags', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: true,
            was_ai_suggestion_edited: false,
          },
          {
            category_id: transportCategoryId,
            amount: '25.50',
            expense_date: '2024-01-16',
            currency: 'PLN',
            created_by_ai: true,
            was_ai_suggestion_edited: true,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.data[0].created_by_ai).toBe(true);
      expect(data.data[0].was_ai_suggestion_edited).toBe(false);
      expect(data.data[1].created_by_ai).toBe(true);
      expect(data.data[1].was_ai_suggestion_edited).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should reject empty expenses array', async () => {
      // Arrange
      const requestBody = {
        expenses: [],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.expenses._errors).toContain('Expenses array cannot be empty');
    });

    it('should reject batch with over 50 expenses', async () => {
      // Arrange: Create 51 expenses
      const expenses = Array(51)
        .fill(null)
        .map((_, index) => ({
          category_id: foodCategoryId,
          amount: '10.00',
          expense_date: '2024-01-15',
          currency: 'PLN',
          created_by_ai: false,
          was_ai_suggestion_edited: false,
        }));

      const requestBody = { expenses };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details.expenses._errors).toContain('Maximum 50 expenses per batch');
    });

    it('should reject expenses with invalid category IDs', async () => {
      // Arrange
      const invalidCategoryId = '550e8400-e29b-41d4-a716-446655440000';

      const requestBody = {
        expenses: [
          {
            category_id: invalidCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.error.code).toBe('INVALID_CATEGORY');
      expect(data.error.details.invalid_category_ids).toContain(invalidCategoryId);
    });

    it('should reject expenses with negative amounts', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '-50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(data.error.details)).toContain('Amount must be greater than 0');
    });

    it('should reject expenses with more than 2 decimal places', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.123', // 3 decimal places
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(data.error.details)).toContain('up to 2 decimal places');
    });

    it('should reject expenses with invalid date format', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '15-01-2024', // Wrong format
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(data.error.details)).toContain('YYYY-MM-DD');
    });

    it('should reject expenses with non-UUID category_id', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: 'not-a-uuid',
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(data.error.details)).toContain('Invalid category ID format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum batch size (50 expenses) successfully', async () => {
      // Arrange: Create exactly 50 expenses
      const expenses = Array(50)
        .fill(null)
        .map((_, index) => ({
          category_id: index % 2 === 0 ? foodCategoryId : transportCategoryId,
          amount: `${10 + index}.00`,
          expense_date: '2024-01-15',
          currency: 'PLN',
          created_by_ai: false,
          was_ai_suggestion_edited: false,
        }));

      const requestBody = { expenses };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.count).toBe(50);
      expect(data.data).toHaveLength(50);
    });

    it('should default currency to PLN when not provided', async () => {
      // Arrange: Don't specify currency
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.data[0].currency).toBe('PLN');
    });

    it('should default AI flags to false when not provided', async () => {
      // Arrange: Don't specify AI flags
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
          },
        ],
      };

      // Act
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.data[0].created_by_ai).toBe(false);
      expect(data.data[0].was_ai_suggestion_edited).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should reject request without authentication', async () => {
      // Arrange
      const requestBody = {
        expenses: [
          {
            category_id: foodCategoryId,
            amount: '50.00',
            expense_date: '2024-01-15',
            currency: 'PLN',
            created_by_ai: false,
            was_ai_suggestion_edited: false,
          },
        ],
      };

      // Act: No user in locals
      const context = {
        request: new Request('http://localhost/api/expenses/batch', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: null },
      } as unknown as APIContext;

      const response = await POST(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('authenticated');
    });
  });
});