import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateCategories,
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  createExpensesBatch
} from "@/lib/services/expense.service.refactored";
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateExpenseCommand, ExpenseQueryParams, UpdateExpenseCommand, BatchExpenseItem } from "@/types";

describe("ExpenseService", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    } as any;
  });

  describe("validateCategories", () => {
    it("should return valid=true for existing categories", async () => {
      // Mock Supabase query to return valid categories
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "uuid-1" }, { id: "uuid-2" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ["uuid-1", "uuid-2"]);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toHaveLength(0);
      expect(result.invalidIds).toEqual([]);

      // Verify correct table and query were called
      expect(mockFrom).toHaveBeenCalledWith("categories");
    });

    it("should detect invalid category IDs", async () => {
      // Mock Supabase query to return empty data (category doesn't exist)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ["invalid-uuid"]);

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toContain("invalid-uuid");
      expect(result.invalidIds).toHaveLength(1);
    });

    it("should handle empty array", async () => {
      // No database call should be made for empty array
      const mockFrom = vi.fn();
      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, []);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
      expect(result.invalidIds).toHaveLength(0);

      // Verify no database query was made
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("should handle mixed valid/invalid IDs", async () => {
      // Mock Supabase query to return only valid categories
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "valid-1" }, { id: "valid-2" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ["valid-1", "invalid-1", "valid-2", "invalid-2"]);

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toEqual(["invalid-1", "invalid-2"]);
      expect(result.invalidIds).toHaveLength(2);

      // Verify valid IDs are not in invalidIds
      expect(result.invalidIds).not.toContain("valid-1");
      expect(result.invalidIds).not.toContain("valid-2");
    });

    it("should preserve order of invalid IDs", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "valid-1" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ["invalid-a", "valid-1", "invalid-b", "invalid-c"]);

      expect(result.valid).toBe(false);
      expect(result.invalidIds).toEqual(["invalid-a", "invalid-b", "invalid-c"]);
    });

    it("should throw error on database error", async () => {
      // Mock Supabase query to return error
      const dbError = new Error("Database connection failed");
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      await expect(validateCategories(mockSupabase, ["uuid-1"])).rejects.toThrow("Database connection failed");
    });

    it("should handle single valid category", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "single-uuid" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, ["single-uuid"]);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it("should handle duplicate category IDs in input", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "uuid-1" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(
        mockSupabase,
        ["uuid-1", "uuid-1", "uuid-1"] // Duplicates
      );

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it("should handle many category IDs efficiently", async () => {
      const validIds = Array.from({ length: 100 }, (_, i) => `valid-${i}`);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: validIds.map((id) => ({ id })),
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, validIds);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });

    it("should handle UUID format variations", async () => {
      // Test with actual UUID formats
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "550e8400-e29b-41d4-a716-446655440000" }, { id: "123e4567-e89b-12d3-a456-426614174000" }],
            error: null,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await validateCategories(mockSupabase, [
        "550e8400-e29b-41d4-a716-446655440000",
        "123e4567-e89b-12d3-a456-426614174000",
      ]);

      expect(result.valid).toBe(true);
      expect(result.invalidIds).toEqual([]);
    });
  });

  describe("createExpense", () => {
    it("should create expense with correct data structure", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "expense-id",
                user_id: "user-123",
                category_id: "category-uuid",
                amount: 50.00,
                expense_date: "2024-01-15",
                currency: "PLN",
                created_at: "2024-01-15T10:00:00Z",
                updated_at: "2024-01-15T10:00:00Z",
                created_by_ai: false,
                was_ai_suggestion_edited: false,
                category: {
                  id: "category-uuid",
                  name: "żywność"
                }
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const expenseData: CreateExpenseCommand = {
        category_id: "category-uuid",
        amount: 50.00,
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = await createExpense(mockSupabase, "user-123", expenseData);

      expect(result).toBeDefined();
      expect(result.user_id).toBe("user-123");
      expect(result.amount).toBe("50"); // Transformed to string
      expect(mockFrom).toHaveBeenCalledWith("expenses");
    });

    it("should enforce user_id from session parameter", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "expense-id",
              user_id: "session-user-id",
              amount: 50.00, // Add missing amount
              category: { id: "cat", name: "test" }
            },
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.from = mockFrom;

      const expenseData: CreateExpenseCommand = {
        category_id: "category-uuid",
        amount: 50.00,
        expense_date: "2024-01-15",
      };

      await createExpense(mockSupabase, "session-user-id", expenseData);

      // Verify that insert was called with session user_id
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "session-user-id",
        })
      );
    });

    it("should apply default currency when not provided", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "expense-id",
              currency: "PLN",
              amount: 50.00, // Add missing amount
              category: { id: "cat", name: "test" }
            },
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.from = mockFrom;

      const expenseData: CreateExpenseCommand = {
        category_id: "category-uuid",
        amount: 50.00,
        expense_date: "2024-01-15",
        // currency omitted
      };

      await createExpense(mockSupabase, "user-123", expenseData);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: "PLN", // Default value
        })
      );
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database constraint violation");
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const expenseData: CreateExpenseCommand = {
        category_id: "category-uuid",
        amount: 50.00,
        expense_date: "2024-01-15",
      };

      await expect(createExpense(mockSupabase, "user-123", expenseData)).rejects.toThrow();
    });
  });

  describe("listExpenses", () => {
    it("should build query with all filters", async () => {
      // Create a chainable mock that supports all Supabase query methods
      const mockQuery: any = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      // Mock the count query
      const mockCountQuery: any = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 5,
        }),
      };

      const mockFrom = vi.fn()
        .mockReturnValueOnce(mockQuery) // First call for main query
        .mockReturnValueOnce(mockCountQuery); // Second call for count query

      mockSupabase.from = mockFrom;

      const params: ExpenseQueryParams = {
        limit: 25,
        offset: 10,
        from_date: "2024-01-01",
        to_date: "2024-01-31",
        category_id: "category-uuid",
        sort: "amount.desc",
      };

      await listExpenses(mockSupabase, params);

      expect(mockFrom).toHaveBeenCalledWith("expenses");
      expect(mockQuery.select).toHaveBeenCalledWith(expect.stringContaining("categories"));
    });

    it("should apply default pagination when not provided", async () => {
      const mockRange = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: mockRange,
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      await listExpenses(mockSupabase, {});

      // Should use default limit=50, offset=0
      expect(mockRange).toHaveBeenCalledWith(0, 49); // range is inclusive
    });

    it("should handle empty results", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await listExpenses(mockSupabase, {});

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getExpenseById", () => {
    it("should fetch single expense by ID", async () => {
      const mockExpense = {
        id: "expense-id",
        user_id: "user-123",
        amount: 75.50,
        category: { id: "cat-id", name: "transport" }, // Fixed: should be 'category' not 'categories'
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExpense,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await getExpenseById(mockSupabase, "expense-id");

      expect(result).toBeDefined();
      expect(result?.id).toBe("expense-id");
      expect(mockFrom).toHaveBeenCalledWith("expenses");
    });

    it("should return null when expense not found", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" }, // PostgREST not found
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await getExpenseById(mockSupabase, "nonexistent-id");

      expect(result).toBeNull();
    });
  });

  describe("updateExpense", () => {
    it("should update expense with partial data", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "expense-id", amount: 99.99, category: { id: "cat", name: "test" } },
              error: null,
            }),
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      mockSupabase.from = mockFrom;

      const updateData: UpdateExpenseCommand = {
        amount: 99.99,
      };

      const result = await updateExpense(mockSupabase, "expense-id", updateData);

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99.99, // Converted to number
        })
      );
    });

    it("should return null when expense not found for update", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" }, // PostgREST not found
              }),
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await updateExpense(mockSupabase, "nonexistent-id", { amount: 50.00 });

      expect(result).toBeNull();
    });
  });

  describe("deleteExpense", () => {
    it("should delete expense successfully", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
            count: 1, // Repository uses count to determine success
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await deleteExpense(mockSupabase, "expense-id");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return failure when expense not found", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
            count: 0, // No rows deleted = not found
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await deleteExpense(mockSupabase, "nonexistent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Expense not found");
    });

    it("should handle database errors gracefully", async () => {
      // Mock repository.delete to throw an error during the operation
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      });

      mockSupabase.from = mockFrom;

      const result = await deleteExpense(mockSupabase, "expense-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("An unexpected error occurred");
    });
  });

  describe("createExpensesBatch", () => {
    it("should create multiple expenses in batch", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: "expense-1", amount: 25.00, category: { id: "cat-1", name: "test1" } },
                { id: "expense-2", amount: 35.00, category: { id: "cat-2", name: "test2" } },
              ],
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = mockFrom;

      const batchItems: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "25.00",
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
        {
          category_id: "cat-2",
          amount: "35.00",
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
      ];

      const result = await createExpensesBatch(mockSupabase, "user-123", batchItems);

      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith("expenses");
    });

    it("should enforce user_id for all batch items", async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      mockSupabase.from = mockFrom;

      const batchItems: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "25.00",
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
      ];

      await createExpensesBatch(mockSupabase, "session-user-id", batchItems);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          user_id: "session-user-id",
        }),
      ]);
    });
  });
});
