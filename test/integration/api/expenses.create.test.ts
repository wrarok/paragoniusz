/**
 * API Integration Tests - POST /api/expenses
 *
 * Tests the expense creation endpoint:
 * - Input validation
 * - Category validation
 * - RLS enforcement (user_id from session)
 * - Default values
 * - Error handling
 *
 * Reference: src/pages/api/expenses/index.ts (POST handler)
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { POST } from "../../../src/pages/api/expenses/index";
import { createAuthenticatedClient } from "../../helpers/test-auth";
import { cleanTestDataWithClient, getCategoryByName } from "../../helpers/test-database";
import { TEST_USER } from "../../integration-setup";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/db/database.types";
import type { APIContext } from "astro";

describe("POST /api/expenses - Create Expense", () => {
  let supabase: SupabaseClient<Database>;
  let categoryId: string;

  beforeAll(async () => {
    // Create ONE authenticated client for entire suite
    supabase = await createAuthenticatedClient();

    // Get a valid category for test expenses
    const category = await getCategoryByName("żywność");
    categoryId = category.id;
  });

  afterEach(async () => {
    await cleanTestDataWithClient(supabase);
  });

  afterAll(async () => {
    await cleanTestDataWithClient(supabase);
  });

  describe("Happy Path", () => {
    it("should create expense with valid data", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "50.00",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(201);

      const data = await response.json();

      // Verify expense data
      expect(data.id).toBeDefined();
      expect(data.user_id).toBe(TEST_USER.id);
      expect(data.category_id).toBe(categoryId);
      expect(data.amount).toBe("50"); // PostgreSQL numeric trims trailing zeros
      expect(data.expense_date).toBe("2024-01-15");
      expect(data.currency).toBe("PLN");
      expect(data.created_by_ai).toBe(false);
      expect(data.was_ai_suggestion_edited).toBe(false);
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();
    });

    it("should return expense with joined category data", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "30.00",
        expense_date: "2024-01-20",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(201);

      const data = await response.json();

      // Verify category is included
      expect(data.category).toBeDefined();
      expect(data.category.id).toBe(categoryId);
      expect(data.category.name).toBe("żywność");
    });

    it("should apply default currency when not provided", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "25.00",
        expense_date: "2024-01-18",
        // currency omitted - should default to PLN
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.currency).toBe("PLN"); // Default value
    });
  });

  describe("Authentication", () => {
    it("should reject request without authentication", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "50.00",
        expense_date: "2024-01-15",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: null, // No authenticated user
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toContain("zalogowany");
    });

    it("should enforce user_id from session (prevent user_id spoofing)", async () => {
      const fakeUserId = "00000000-0000-0000-0000-000000000000";

      const requestBody = {
        category_id: categoryId,
        amount: "50.00",
        expense_date: "2024-01-15",
        user_id: fakeUserId, // Attempt to spoof user_id
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(201);

      const data = await response.json();

      // Should use session user_id, NOT the one from request body
      expect(data.user_id).toBe(TEST_USER.id);
      expect(data.user_id).not.toBe(fakeUserId);
    });
  });

  describe("Validation Errors", () => {
    it("should reject invalid amount (negative)", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "-50.00", // Invalid: negative
        expense_date: "2024-01-15",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details).toBeDefined();
    });

    it("should reject invalid amount (too many decimals)", async () => {
      const requestBody = {
        category_id: categoryId,
        amount: "50.123", // Invalid: 3 decimal places
        expense_date: "2024-01-15",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject future date", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const requestBody = {
        category_id: categoryId,
        amount: "50.00",
        expense_date: futureDateStr, // Future date
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject invalid category_id (non-existent)", async () => {
      const fakeCategoryId = "00000000-0000-0000-0000-000000000000";

      const requestBody = {
        category_id: fakeCategoryId,
        amount: "50.00",
        expense_date: "2024-01-15",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error.code).toBe("CATEGORY_NOT_FOUND");
      expect(data.error.details.category_id).toBe(fakeCategoryId);
    });

    it("should reject invalid category_id (not a UUID)", async () => {
      const requestBody = {
        category_id: "not-a-uuid",
        amount: "50.00",
        expense_date: "2024-01-15",
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Error Handling", () => {
    it("should return 400 for malformed JSON", async () => {
      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "invalid-json{", // Malformed JSON
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("INVALID_JSON");
    });

    it("should return 400 for missing required fields", async () => {
      const requestBody = {
        // Missing all required fields
      };

      const context = {
        request: new Request("http://localhost/api/expenses", {
          method: "POST",
          body: JSON.stringify(requestBody),
        }),
        locals: {
          supabase,
          user: { id: TEST_USER.id, email: TEST_USER.email },
        },
      } as unknown as APIContext;

      const response = await POST(context);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details).toBeDefined();

      // Should have errors for required fields
      expect(data.error.details.category_id).toBeDefined();
      expect(data.error.details.amount).toBeDefined();
      expect(data.error.details.expense_date).toBeDefined();
    });
  });
});
