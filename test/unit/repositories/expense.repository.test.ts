import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ExpenseRepository,
  type DatabaseExpense,
  type InsertExpense,
} from "../../../src/lib/repositories/expense.repository";
import { ExpenseQueryBuilder } from "../../../src/lib/builders/expense-query.builder";

describe("ExpenseRepository", () => {
  // Mock Supabase client
  const createMockSupabase = () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn(),
      in: vi.fn(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    return {
      from: vi.fn().mockReturnValue(mockQuery),
      mockQuery,
    };
  };

  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let repository: ExpenseRepository;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    repository = new ExpenseRepository(mockSupabase as any);
  });

  describe("findById", () => {
    it("should find expense by ID", async () => {
      const mockExpense: DatabaseExpense = {
        id: "123",
        user_id: "user-1",
        category_id: "cat-1",
        amount: 100.5,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        category: { id: "cat-1", name: "Food" },
      };

      mockSupabase.mockQuery.single.mockResolvedValue({
        data: mockExpense,
        error: null,
      });

      const result = await repository.findById("123");

      expect(mockSupabase.from).toHaveBeenCalledWith("expenses");
      expect(mockSupabase.mockQuery.select).toHaveBeenCalledWith("*, category:categories(id, name)");
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("id", "123");
      expect(result).toEqual(mockExpense);
    });

    it("should return null when expense not found", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error for other database errors", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "SOME_ERROR", message: "Database error" },
      });

      await expect(repository.findById("123")).rejects.toThrow();
    });
  });

  describe("findMany", () => {
    it("should find expenses using query builder", async () => {
      const mockExpenses: DatabaseExpense[] = [
        {
          id: "1",
          user_id: "user-1",
          category_id: "cat-1",
          amount: 10.5,
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: false,
          was_ai_suggestion_edited: false,
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
          category: { id: "cat-1", name: "Food" },
        },
      ];

      const queryBuilder = new ExpenseQueryBuilder();
      queryBuilder.withCategory("cat-1");

      // Mock the promise chain
      const mockPromise = Promise.resolve({ data: mockExpenses, error: null });
      vi.spyOn(queryBuilder, "build").mockReturnValue(mockPromise as any);

      const result = await repository.findMany(queryBuilder);

      expect(queryBuilder.build).toHaveBeenCalled();
      expect(result).toEqual(mockExpenses);
    });

    it("should return empty array when no expenses found", async () => {
      const queryBuilder = new ExpenseQueryBuilder();

      const mockPromise = Promise.resolve({ data: [], error: null });
      vi.spyOn(queryBuilder, "build").mockReturnValue(mockPromise as any);

      const result = await repository.findMany(queryBuilder);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const queryBuilder = new ExpenseQueryBuilder();

      const mockPromise = Promise.resolve({ data: null, error: { message: "Database error" } });
      vi.spyOn(queryBuilder, "build").mockReturnValue(mockPromise as any);

      await expect(repository.findMany(queryBuilder)).rejects.toThrow("Failed to fetch expenses");
    });
  });

  describe("count", () => {
    it("should count expenses using query builder", async () => {
      const queryBuilder = new ExpenseQueryBuilder();

      const mockPromise = Promise.resolve({ count: 42, error: null });
      vi.spyOn(queryBuilder, "buildCountQuery").mockReturnValue(mockPromise as any);

      const result = await repository.count(queryBuilder);

      expect(queryBuilder.buildCountQuery).toHaveBeenCalled();
      expect(result).toBe(42);
    });

    it("should return 0 when no expenses", async () => {
      const queryBuilder = new ExpenseQueryBuilder();

      const mockPromise = Promise.resolve({ count: 0, error: null });
      vi.spyOn(queryBuilder, "buildCountQuery").mockReturnValue(mockPromise as any);

      const result = await repository.count(queryBuilder);

      expect(result).toBe(0);
    });

    it("should throw error on database failure", async () => {
      const queryBuilder = new ExpenseQueryBuilder();

      const mockPromise = Promise.resolve({ count: null, error: { message: "Database error" } });
      vi.spyOn(queryBuilder, "buildCountQuery").mockReturnValue(mockPromise as any);

      await expect(repository.count(queryBuilder)).rejects.toThrow("Failed to count expenses");
    });
  });

  describe("create", () => {
    it("should create expense", async () => {
      const insertData: InsertExpense = {
        user_id: "user-1",
        category_id: "cat-1",
        amount: 100,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      };

      const mockCreated: DatabaseExpense = {
        id: "new-123",
        ...insertData,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        category: { id: "cat-1", name: "Food" },
      };

      mockSupabase.mockQuery.single.mockResolvedValue({
        data: mockCreated,
        error: null,
      });

      const result = await repository.create(insertData);

      expect(mockSupabase.from).toHaveBeenCalledWith("expenses");
      expect(mockSupabase.mockQuery.insert).toHaveBeenCalledWith(insertData);
      expect(result).toEqual(mockCreated);
    });

    it("should throw error on creation failure", async () => {
      const insertData: InsertExpense = {
        user_id: "user-1",
        category_id: "cat-1",
        amount: 100,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      };

      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      await expect(repository.create(insertData)).rejects.toThrow();
    });
  });

  describe("createBatch", () => {
    it("should create multiple expenses", async () => {
      const insertData: InsertExpense[] = [
        {
          user_id: "user-1",
          category_id: "cat-1",
          amount: 10,
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
        {
          user_id: "user-1",
          category_id: "cat-2",
          amount: 20,
          expense_date: "2024-01-16",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
      ];

      const mockCreated: DatabaseExpense[] = [
        {
          id: "1",
          ...insertData[0],
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
          category: { id: "cat-1", name: "Food" },
        },
        {
          id: "2",
          ...insertData[1],
          created_at: "2024-01-16T10:00:00Z",
          updated_at: "2024-01-16T10:00:00Z",
          category: { id: "cat-2", name: "Transport" },
        },
      ];

      mockSupabase.mockQuery.order.mockResolvedValue({
        data: mockCreated,
        error: null,
      });

      const result = await repository.createBatch(insertData);

      expect(mockSupabase.mockQuery.insert).toHaveBeenCalledWith(insertData);
      expect(result).toEqual(mockCreated);
    });

    it("should throw error on batch creation failure", async () => {
      const insertData: InsertExpense[] = [
        {
          user_id: "user-1",
          category_id: "cat-1",
          amount: 10,
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: false,
          was_ai_suggestion_edited: false,
        },
      ];

      mockSupabase.mockQuery.select.mockResolvedValue({
        data: null,
        error: { message: "Batch insert failed" },
      });

      await expect(repository.createBatch(insertData)).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update expense", async () => {
      const updateData: Partial<InsertExpense> = {
        amount: 200,
        category_id: "cat-2",
      };

      const mockUpdated: DatabaseExpense = {
        id: "123",
        user_id: "user-1",
        category_id: "cat-2",
        amount: 200,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T11:00:00Z",
        category: { id: "cat-2", name: "Transport" },
      };

      mockSupabase.mockQuery.single.mockResolvedValue({
        data: mockUpdated,
        error: null,
      });

      const result = await repository.update("123", updateData);

      expect(mockSupabase.mockQuery.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabase.mockQuery.eq).toHaveBeenCalledWith("id", "123");
      expect(result).toEqual(mockUpdated);
    });

    it("should return null when expense not found", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await repository.update("nonexistent", { amount: 100 });

      expect(result).toBeNull();
    });

    it("should throw error on update failure", async () => {
      mockSupabase.mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: "SOME_ERROR", message: "Update failed" },
      });

      await expect(repository.update("123", { amount: 100 })).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete expense and return true", async () => {
      // Mock delete to return an object with eq method
      mockSupabase.mockQuery.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
          count: 1,
        }),
      });

      const result = await repository.delete("123");

      expect(mockSupabase.mockQuery.delete).toHaveBeenCalledWith({ count: "exact" });
      expect(result).toBe(true);
    });

    it("should return false when expense not found", async () => {
      mockSupabase.mockQuery.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
          count: 0,
        }),
      });

      const result = await repository.delete("nonexistent");

      expect(result).toBe(false);
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.mockQuery.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: "Delete failed" },
          count: null,
        }),
      });

      await expect(repository.delete("123")).rejects.toThrow();
    });
  });

  describe("validateCategories", () => {
    it("should return empty array when all categories valid", async () => {
      mockSupabase.mockQuery.in.mockResolvedValue({
        data: [{ id: "cat-1" }, { id: "cat-2" }],
        error: null,
      });

      const result = await repository.validateCategories(["cat-1", "cat-2"]);

      expect(result).toEqual([]);
    });

    it("should return invalid IDs", async () => {
      mockSupabase.mockQuery.in.mockResolvedValue({
        data: [{ id: "cat-1" }],
        error: null,
      });

      const result = await repository.validateCategories(["cat-1", "cat-2", "cat-3"]);

      expect(result).toEqual(["cat-2", "cat-3"]);
    });

    it("should return empty array for empty input", async () => {
      const result = await repository.validateCategories([]);

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("should throw error on database failure", async () => {
      mockSupabase.mockQuery.in.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      await expect(repository.validateCategories(["cat-1"])).rejects.toThrow();
    });
  });
});
