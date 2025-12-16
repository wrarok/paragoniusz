/**
 * Unit Tests - API Endpoints /api/expenses/[id]
 *
 * Tests the individual expense API endpoints logic without real database:
 * - GET /api/expenses/[id] - retrieve single expense
 * - PATCH /api/expenses/[id] - update expense
 * - DELETE /api/expenses/[id] - delete expense
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "../../../src/pages/api/expenses/[id]";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseDTO, CategoryDTO } from "../../../src/types";

// Mock the service layer
vi.mock("../../../src/lib/services/expense.service.refactored", () => ({
  getExpenseById: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  validateCategories: vi.fn(),
}));

// Helper function to create mock ExpenseDTO
function createMockExpenseDTO(overrides: Partial<ExpenseDTO> = {}): ExpenseDTO {
  return {
    id: "expense-id",
    user_id: "test-user-id",
    category_id: "category-uuid",
    amount: "50.00",
    expense_date: "2024-01-15",
    currency: "PLN",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    created_by_ai: false,
    was_ai_suggestion_edited: false,
    category: {
      id: "category-uuid",
      name: "żywność",
    },
    ...overrides,
  };
}

describe("GET /api/expenses/[id]", () => {
  let mockSupabase: SupabaseClient;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {} as SupabaseClient;

    mockContext = {
      request: new Request("http://localhost/api/expenses/550e8400-e29b-41d4-a716-446655440000"),
      params: { id: "550e8400-e29b-41d4-a716-446655440000" }, // Use valid UUID
      locals: {
        supabase: mockSupabase,
        user: { id: "test-user-id", email: "test@example.com" },
      },
      cookies: {} as any,
      url: new URL("http://localhost/api/expenses/550e8400-e29b-41d4-a716-446655440000"),
      clientAddress: "127.0.0.1",
      generator: "test",
      redirect: vi.fn(),
      rewrite: vi.fn(),
    } as unknown as APIContext;
  });

  // Note: Authentication not yet implemented in GET endpoint

  describe("Parameter Validation", () => {
    it("should reject invalid UUID format", async () => {
      mockContext.params = { id: "invalid-uuid" };

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.field).toBe("id");
      expect(data.error.details.provided).toBe("invalid-uuid");
    });

    it("should accept valid UUID", async () => {
      const { getExpenseById } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(getExpenseById).mockResolvedValue(createMockExpenseDTO());

      mockContext.params = { id: "550e8400-e29b-41d4-a716-446655440000" };

      const response = await GET(mockContext);

      expect(response.status).toBe(200);
      expect(getExpenseById).toHaveBeenCalledWith(mockSupabase, "550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("Service Layer Integration", () => {
    it("should return expense when found", async () => {
      const { getExpenseById } = await import("../../../src/lib/services/expense.service.refactored");
      const mockExpense = createMockExpenseDTO({ id: "550e8400-e29b-41d4-a716-446655440000", amount: "75.50" });
      vi.mocked(getExpenseById).mockResolvedValue(mockExpense);

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockExpense);
      expect(getExpenseById).toHaveBeenCalledWith(mockSupabase, "550e8400-e29b-41d4-a716-446655440000");
    });

    it("should return 404 when expense not found", async () => {
      const { getExpenseById } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(getExpenseById).mockResolvedValue(null);

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("EXPENSE_NOT_FOUND");
    });

    it("should handle service layer errors", async () => {
      const { getExpenseById } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(getExpenseById).mockRejectedValue(new Error("Database error"));

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("PATCH /api/expenses/[id]", () => {
  let mockSupabase: SupabaseClient;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {} as SupabaseClient;

    mockContext = {
      request: new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }),
      params: { id: "550e8400-e29b-41d4-a716-446655440000" }, // Use valid UUID
      locals: {
        supabase: mockSupabase,
        user: { id: "test-user-id", email: "test@example.com" },
      },
      cookies: {} as any,
      url: new URL("http://localhost/api/expenses/expense-id"),
      clientAddress: "127.0.0.1",
      generator: "test",
      redirect: vi.fn(),
      rewrite: vi.fn(),
    } as unknown as APIContext;
  });

  // Note: Authentication not yet implemented in PATCH endpoint

  describe("Request Body Validation", () => {
    it("should reject malformed JSON", async () => {
      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should reject invalid amount", async () => {
      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "-50.00", // Invalid: negative
        }),
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors).toBeDefined();
      expect(data.error.details.fieldErrors.amount).toBeDefined();
    });

    it("should reject future dates", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_date: futureDateStr,
        }),
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.fieldErrors).toBeDefined();
      expect(data.error.details.fieldErrors.expense_date).toBeDefined();
    });

    it("should accept partial updates", async () => {
      const { validateCategories, updateExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(updateExpense).mockResolvedValue(createMockExpenseDTO());

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "99.99", // Only update amount
        }),
      });

      const response = await PATCH(mockContext);

      expect(response.status).toBe(200);
      expect(updateExpense).toHaveBeenCalledWith(
        mockSupabase,
        "550e8400-e29b-41d4-a716-446655440000",
        { amount: 99.99 }
      );
    });
  });

  describe("Category Validation", () => {
    it("should validate category when provided", async () => {
      const { validateCategories, updateExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(updateExpense).mockResolvedValue(createMockExpenseDTO());

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440001", // Valid UUID (different from default)
        }),
      });

      await PATCH(mockContext);

      expect(validateCategories).toHaveBeenCalledWith(mockSupabase, ["550e8400-e29b-41d4-a716-446655440001"]);
    });

    it("should reject invalid category", async () => {
      const { validateCategories } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({
        valid: false,
        invalidIds: ["invalid-category-uuid"],
      });

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440002", // Valid UUID format but invalid category
        }),
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.code).toBe("INVALID_CATEGORY");
    });

    it("should skip category validation when not provided", async () => {
      const { validateCategories, updateExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(updateExpense).mockResolvedValue(createMockExpenseDTO());

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "75.00", // No category_id
        }),
      });

      await PATCH(mockContext);

      expect(validateCategories).not.toHaveBeenCalled();
    });
  });

  describe("Service Layer Integration", () => {
    it("should update expense successfully", async () => {
      const { validateCategories, updateExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      const updatedExpense = createMockExpenseDTO({ amount: "125.00" });
      vi.mocked(updateExpense).mockResolvedValue(updatedExpense);

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440001", // Valid UUID
          amount: "125.00",
          expense_date: "2024-02-01",
        }),
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedExpense);
      expect(updateExpense).toHaveBeenCalledWith(
        mockSupabase,
        "550e8400-e29b-41d4-a716-446655440000",
        {
          category_id: "550e8400-e29b-41d4-a716-446655440001",
          amount: 125.00, // Number after Zod transformation
          expense_date: "2024-02-01",
        }
      );
    });

    it("should return 404 when expense not found", async () => {
      const { updateExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(updateExpense).mockResolvedValue(null);

      mockContext.request = new Request("http://localhost/api/expenses/expense-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "100.00",
        }),
      });

      const response = await PATCH(mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("EXPENSE_NOT_FOUND");
    });
  });
});

describe("DELETE /api/expenses/[id]", () => {
  let mockSupabase: SupabaseClient;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {} as SupabaseClient;

    mockContext = {
      request: new Request("http://localhost/api/expenses/expense-id", {
        method: "DELETE",
      }),
      params: { id: "550e8400-e29b-41d4-a716-446655440000" }, // Use valid UUID
      locals: {
        supabase: mockSupabase,
        user: { id: "test-user-id", email: "test@example.com" },
      },
      cookies: {} as any,
      url: new URL("http://localhost/api/expenses/expense-id"),
      clientAddress: "127.0.0.1",
      generator: "test",
      redirect: vi.fn(),
      rewrite: vi.fn(),
    } as unknown as APIContext;
  });

  // Note: Authentication not yet implemented in DELETE endpoint

  describe("Parameter Validation", () => {
    it("should reject invalid UUID format", async () => {
      mockContext.params = { id: "invalid-uuid" };

      const response = await DELETE(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.field).toBe("id");
      expect(data.error.details.provided).toBe("invalid-uuid");
    });
  });

  describe("Service Layer Integration", () => {
    it("should delete expense successfully", async () => {
      const { deleteExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(deleteExpense).mockResolvedValue({ success: true });

      const response = await DELETE(mockContext);

      expect(response.status).toBe(204);
      expect(deleteExpense).toHaveBeenCalledWith(mockSupabase, "550e8400-e29b-41d4-a716-446655440000");
    });

    it("should return 404 when expense not found", async () => {
      const { deleteExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(deleteExpense).mockResolvedValue({ success: false, error: "Expense not found" });

      const response = await DELETE(mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("EXPENSE_NOT_FOUND");
    });

    it("should handle service layer errors", async () => {
      const { deleteExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(deleteExpense).mockRejectedValue(new Error("Database error"));

      const response = await DELETE(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});