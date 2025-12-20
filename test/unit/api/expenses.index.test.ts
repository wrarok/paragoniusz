/**
 * Unit Tests - API Endpoints /api/expenses
 *
 * Tests the expense API endpoints logic without real database:
 * - Request validation (Zod schemas)
 * - Authentication checks
 * - Error handling and response formatting
 * - Service layer interaction
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../../../src/pages/api/expenses/index";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExpenseListDTO, ExpenseDTO, CategoryDTO } from "../../../src/types";

// Mock the service layer
vi.mock("../../../src/lib/services/expense.service.refactored", () => ({
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
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

// Helper function to create mock CategoryDTO
function createMockCategoryDTO(overrides: Partial<CategoryDTO> = {}): CategoryDTO {
  return {
    id: "category-uuid",
    name: "żywność",
    ...overrides,
  };
}

describe("GET /api/expenses", () => {
  let mockSupabase: SupabaseClient;
  let mockContext: APIContext;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {} as SupabaseClient;

    // Create base mock context
    mockContext = {
      request: new Request("http://localhost/api/expenses"),
      locals: {
        supabase: mockSupabase,
        user: { id: "test-user-id", email: "test@example.com" },
      },
      cookies: {} as any,
      url: new URL("http://localhost/api/expenses"),
      clientAddress: "127.0.0.1",
      generator: "test",
      redirect: vi.fn(),
      rewrite: vi.fn(),
      params: {},
    } as unknown as APIContext;
  });

  describe("Query Parameter Validation", () => {
    it("should accept valid query parameters", async () => {
      const { listExpenses } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(listExpenses).mockResolvedValue({
        data: [],
        count: 0,
        total: 0,
      });

      mockContext.request = new Request(
        "http://localhost/api/expenses?limit=10&offset=0&from_date=2024-01-01&to_date=2024-12-31&sort=expense_date.desc"
      );

      const response = await GET(mockContext);

      expect(response.status).toBe(200);
      expect(listExpenses).toHaveBeenCalledWith(mockSupabase, {
        limit: 10,
        offset: 0,
        from_date: "2024-01-01",
        to_date: "2024-12-31",
        category_id: undefined, // Zod transforms null to undefined
        sort: "expense_date.desc",
      });
    });

    it("should reject invalid limit parameter", async () => {
      mockContext.request = new Request("http://localhost/api/expenses?limit=invalid");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toBe("Invalid query parameters");
      expect(data.error.details.limit).toBeDefined();
    });

    it("should reject limit exceeding maximum", async () => {
      mockContext.request = new Request("http://localhost/api/expenses?limit=101");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.limit).toBeDefined();
    });

    it("should reject invalid date format", async () => {
      mockContext.request = new Request("http://localhost/api/expenses?from_date=invalid-date");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.from_date).toBeDefined();
    });

    it("should reject invalid sort parameter", async () => {
      mockContext.request = new Request("http://localhost/api/expenses?sort=invalid.sort");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.details.sort).toBeDefined();
    });

    it("should use default values for missing parameters", async () => {
      const { listExpenses } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(listExpenses).mockResolvedValue({
        data: [],
        count: 0,
        total: 0,
      });

      const response = await GET(mockContext);

      expect(response.status).toBe(200);
      expect(listExpenses).toHaveBeenCalledWith(mockSupabase, {
        limit: 50, // default
        offset: 0, // default
        from_date: undefined, // Zod transforms null to undefined
        to_date: undefined, // Zod transforms null to undefined
        category_id: undefined, // Zod transforms null to undefined
        sort: "expense_date.desc", // default
      });
    });
  });

  describe("Service Layer Integration", () => {
    it("should call listExpenses service with validated parameters", async () => {
      const { listExpenses } = await import("../../../src/lib/services/expense.service.refactored");
      const mockResult: ExpenseListDTO = {
        data: [createMockExpenseDTO({ id: "1", amount: "50.00" })],
        count: 1,
        total: 1,
      };
      vi.mocked(listExpenses).mockResolvedValue(mockResult);

      mockContext.request = new Request("http://localhost/api/expenses?limit=25");

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(listExpenses).toHaveBeenCalledWith(mockSupabase, {
        limit: 25,
        offset: 0,
        from_date: undefined, // Zod transforms null to undefined
        to_date: undefined, // Zod transforms null to undefined
        category_id: undefined, // Zod transforms null to undefined
        sort: "expense_date.desc",
      });
    });

    it("should handle service layer errors", async () => {
      const { listExpenses } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(listExpenses).mockRejectedValue(new Error("Database connection failed"));

      const response = await GET(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("An unexpected error occurred while fetching expenses");
    });
  });
});

describe("POST /api/expenses", () => {
  let mockSupabase: SupabaseClient;
  let mockContext: APIContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {} as SupabaseClient;

    mockContext = {
      request: new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      locals: {
        supabase: mockSupabase,
        user: { id: "test-user-id", email: "test@example.com" },
      },
      cookies: {} as any,
      url: new URL("http://localhost/api/expenses"),
      clientAddress: "127.0.0.1",
      generator: "test",
      redirect: vi.fn(),
      rewrite: vi.fn(),
      params: {},
    } as unknown as APIContext;
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      mockContext.locals.user = undefined;

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(data.error.message).toContain("zalogowany");
    });

    it("should accept authenticated requests", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(createExpense).mockResolvedValue(createMockExpenseDTO({
        id: "expense-id",
        user_id: "test-user-id",
        amount: "50.00",
      }));

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);

      expect(response.status).toBe(201);
    });
  });

  describe("Request Body Validation", () => {
    it("should reject malformed JSON", async () => {
      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_JSON");
      expect(data.error.message).toContain("JSON");
    });

    it("should reject missing required fields", async () => {
      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details.category_id).toBeDefined();
      expect(data.error.details.amount).toBeDefined();
      expect(data.error.details.expense_date).toBeDefined();
    });

    it("should reject invalid amount (negative)", async () => {
      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "category-uuid",
          amount: "-50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details.amount).toBeDefined();
    });

    it("should reject invalid amount (too many decimals)", async () => {
      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "category-uuid",
          amount: "50.123",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details.amount).toBeDefined();
    });

    it("should reject future dates", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "category-uuid",
          amount: "50.00",
          expense_date: futureDateStr,
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details.expense_date).toBeDefined();
    });

    it("should reject invalid category_id format", async () => {
      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "not-a-uuid",
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.details.category_id).toBeDefined();
    });

    it("should apply default currency when not provided", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(createExpense).mockResolvedValue(createMockExpenseDTO({
        id: "expense-id",
        user_id: "test-user-id",
        amount: "50.00",
        currency: "PLN",
      }));

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
          // currency omitted - should default to PLN
        }),
      });

      const response = await POST(mockContext);

      expect(response.status).toBe(201);
      expect(createExpense).toHaveBeenCalledWith(
        mockSupabase,
        "test-user-id",
        {
          amount: 50, // Zod transforms string to number
          category_id: "550e8400-e29b-41d4-a716-446655440000",
          expense_date: "2024-01-15",
          // currency is optional and not included if not provided in request
        }
      );
    });
  });

  describe("Category Validation", () => {
    it("should validate category exists", async () => {
      const { validateCategories } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      await POST(mockContext);

      expect(validateCategories).toHaveBeenCalledWith(mockSupabase, ["550e8400-e29b-41d4-a716-446655440000"]);
    });

    it("should reject non-existent category", async () => {
      const { validateCategories } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({
        valid: false,
        invalidIds: ["550e8400-e29b-41d4-a716-446655440002"],
      });

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440002", // Valid UUID format but invalid category
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error.code).toBe("CATEGORY_NOT_FOUND");
      expect(data.error.details.category_id).toBe("550e8400-e29b-41d4-a716-446655440002");
    });
  });

  describe("User ID Enforcement", () => {
    it("should use user_id from session, not request body", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(createExpense).mockResolvedValue(createMockExpenseDTO({
        id: "expense-id",
        user_id: "test-user-id",
        amount: "50.00",
      }));

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
          user_id: "fake-user-id", // Attempt to spoof user_id
        }),
      });

      const response = await POST(mockContext);

      expect(response.status).toBe(201);
      // Should use session user_id, NOT the one from request body
      expect(createExpense).toHaveBeenCalledWith(
        mockSupabase,
        "test-user-id", // From session
        expect.any(Object)
      );
    });
  });

  describe("Service Layer Integration", () => {
    it("should call createExpense service with correct parameters", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      const mockExpense = createMockExpenseDTO({
        id: "expense-id",
        user_id: "test-user-id",
        category_id: "category-uuid",
        amount: "50.00",
        expense_date: "2024-01-15",
        currency: "PLN",
      });
      vi.mocked(createExpense).mockResolvedValue(mockExpense);

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockExpense);
      expect(createExpense).toHaveBeenCalledWith(
        mockSupabase,
        "test-user-id",
        {
          category_id: "550e8400-e29b-41d4-a716-446655440000",
          amount: 50, // Zod transforms string to number
          expense_date: "2024-01-15",
          // currency is not included when not provided in request body
        }
      );
    });

    it("should handle service layer errors", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(createExpense).mockRejectedValue(new Error("Database error"));

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: "2024-01-15",
        }),
      });

      const response = await POST(mockContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toContain("nieoczekiwany błąd");
    });
  });

  describe("Date Validation Edge Cases", () => {
    it("should log warning for dates older than 1 year but not block creation", async () => {
      const { validateCategories, createExpense } = await import("../../../src/lib/services/expense.service.refactored");
      vi.mocked(validateCategories).mockResolvedValue({ valid: true, invalidIds: [] });
      vi.mocked(createExpense).mockResolvedValue(createMockExpenseDTO({
        id: "expense-id",
        user_id: "test-user-id",
        amount: "50.00",
      }));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const oldDateStr = oldDate.toISOString().split("T")[0];

      mockContext.request = new Request("http://localhost/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          amount: "50.00",
          expense_date: oldDateStr,
        }),
      });

      const response = await POST(mockContext);

      expect(response.status).toBe(201);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("more than 1 year old")
      );

      consoleSpy.mockRestore();
    });
  });
});