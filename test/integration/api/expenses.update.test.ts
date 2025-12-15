import { describe, it, expect, beforeAll, afterEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/db/database.types";
import { PATCH } from "../../../src/pages/api/expenses/[id]";
import {
  createAuthenticatedClient,
  createClientWithUser,
  createServiceRoleClient,
  TEST_USER_B,
} from "../../helpers/test-auth";

/**
 * Checks if the client is using Service Role Key (which bypasses RLS)
 */
async function isUsingServiceRole(client: any): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    return !user;
  } catch {
    return true;
  }
}
import { TEST_USER } from "../../integration-setup";
import { createTestExpense, cleanTestDataWithClient, getCategoryByName } from "../../helpers/test-database";

describe("PATCH /api/expenses/[id] - Update Expense", () => {
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    // Suite-level authentication: create ONE session for all tests
    supabase = await createAuthenticatedClient();
  });

  afterEach(async () => {
    // Clean test data after each test using the shared authenticated client
    await cleanTestDataWithClient(supabase);
  });

  describe("Happy Path", () => {
    it("should update single field (amount)", async () => {
      // Arrange: Create test expense
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        amount: "75.50",
      };

      // Act: Update expense
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.amount).toBe("75.5"); // PostgreSQL numeric trims trailing zeros
      expect(data.category_id).toBe(category!.id); // Unchanged
      expect(data.expense_date).toBe("2024-01-15"); // Unchanged
    });

    it("should update multiple fields simultaneously", async () => {
      // Arrange
      const oldCategory = await getCategoryByName("żywność");
      const newCategory = await getCategoryByName("transport");
      const expense = await createTestExpense(supabase, {
        category_id: oldCategory!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        category_id: newCategory!.id,
        amount: "100.00",
        expense_date: "2024-01-20",
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.amount).toBe("100");
      expect(data.category_id).toBe(newCategory!.id);
      expect(data.expense_date).toBe("2024-01-20");
      expect(data.category.name).toBe("transport");
    });

    it("should update only expense_date (partial update)", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        expense_date: "2024-01-20",
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.expense_date).toBe("2024-01-20");
      expect(data.amount).toBe("50"); // Unchanged
      expect(data.category_id).toBe(category!.id); // Unchanged
    });
  });

  describe("Validation Errors", () => {
    it("should reject empty body (no fields provided)", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {}; // Empty

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.formErrors).toContain("At least one field must be provided for update");
    });

    it("should reject negative amount", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        amount: "-10.00",
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors.amount).toBeDefined();
      expect(data.error.details.fieldErrors.amount[0]).toContain("greater than 0");
    });

    it("should reject future expense_date", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const requestBody = {
        expense_date: futureDateStr,
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors.expense_date).toBeDefined();
      expect(data.error.details.fieldErrors.expense_date[0]).toContain("cannot be in the future");
    });

    it("should reject invalid category_id format (not UUID)", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        category_id: "invalid-uuid",
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors.category_id).toBeDefined();
      expect(data.error.details.fieldErrors.category_id[0]).toContain("UUID");
    });

    it("should reject non-existent category_id (422)", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const nonExistentCategoryId = "550e8400-e29b-41d4-a716-446655440000";

      const requestBody = {
        category_id: nonExistentCategoryId,
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(422);
      expect(data.error.code).toBe("INVALID_CATEGORY");
      expect(data.error.message).toContain("does not exist");
      expect(data.error.details.category_id).toBe(nonExistentCategoryId);
    });

    it("should reject amount with more than 2 decimal places", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        amount: "45.123", // 3 decimal places
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors.amount).toBeDefined();
      expect(data.error.details.fieldErrors.amount[0]).toContain("maximum 2 decimal places");
    });
  });

  describe("RLS Enforcement", () => {
    it.skipIf(async () => {
      const supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);
      return (await isUsingServiceRole(supabase)) || (await isUsingServiceRole(supabaseB));
    })("should return 404 when trying to update another users expense", async () => {
      // Arrange: Create expense as TEST_USER
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      // Create authenticated client for TEST_USER_B
      const supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);

      const requestBody = {
        amount: "100.00",
      };

      // Act: Try to update as TEST_USER_B
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase: supabaseB, user: { id: "user-b-id", email: TEST_USER_B.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert: RLS should prevent update, returning 404
      expect(response.status).toBe(404);
      expect(data.error.code).toBe("EXPENSE_NOT_FOUND");

      // Cleanup: Remove TEST_USER_B data
      await cleanTestDataWithClient(supabaseB);
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for non-existent expense ID", async () => {
      // Arrange
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440000";

      const requestBody = {
        amount: "100.00",
      };

      // Act
      const context = {
        params: { id: nonExistentId },
        request: new Request(`http://localhost/api/expenses/${nonExistentId}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error.code).toBe("EXPENSE_NOT_FOUND");
    });

    it("should return 400 for invalid UUID format in path", async () => {
      // Arrange
      const invalidId = "not-a-valid-uuid";

      const requestBody = {
        amount: "100.00",
      };

      // Act
      const context = {
        params: { id: invalidId },
        request: new Request(`http://localhost/api/expenses/${invalidId}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toContain("Invalid expense ID format");
      expect(data.error.details.provided).toBe(invalidId);
    });
  });

  describe("Edge Cases", () => {
    it("should succeed when updating with same value", async () => {
      // Arrange
      const category = await getCategoryByName("żywność");
      const expense = await createTestExpense(supabase, {
        category_id: category!.id,
        amount: "50.00",
        expense_date: "2024-01-15",
      });

      const requestBody = {
        amount: "50.00", // Same value
      };

      // Act
      const context = {
        params: { id: expense.id },
        request: new Request(`http://localhost/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        }),
        locals: { supabase, user: { id: TEST_USER.id, email: TEST_USER.email } },
      } as unknown as APIContext;

      const response = await PATCH(context);
      const data = await response.json();

      // Assert: Should succeed (idempotent operation)
      expect(response.status).toBe(200);
      expect(data.amount).toBe("50"); // Same value
      expect(data.id).toBe(expense.id);
    });
  });
});
