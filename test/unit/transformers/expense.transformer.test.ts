import { describe, it, expect } from "vitest";
import { ExpenseTransformer } from "../../../src/lib/transformers/expense.transformer";
import type { DatabaseExpense } from "../../../src/lib/repositories/expense.repository";
import type { CreateExpenseCommand, UpdateExpenseCommand, BatchExpenseItem } from "../../../src/types";

describe("ExpenseTransformer", () => {
  describe("toDTO", () => {
    it("should transform database expense to DTO", () => {
      const dbExpense: DatabaseExpense = {
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

      const result = ExpenseTransformer.toDTO(dbExpense);

      expect(result).toEqual({
        id: "123",
        user_id: "user-1",
        category_id: "cat-1",
        amount: "100.5", // Converted to string
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        category: { id: "cat-1", name: "Food" },
      });
    });

    it("should handle AI-created expenses", () => {
      const dbExpense: DatabaseExpense = {
        id: "123",
        user_id: "user-1",
        category_id: "cat-1",
        amount: 50.25,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: true,
        was_ai_suggestion_edited: true,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        category: { id: "cat-1", name: "Transport" },
      };

      const result = ExpenseTransformer.toDTO(dbExpense);

      expect(result.created_by_ai).toBe(true);
      expect(result.was_ai_suggestion_edited).toBe(true);
    });

    it("should convert integer amounts to string", () => {
      const dbExpense: DatabaseExpense = {
        id: "123",
        user_id: "user-1",
        category_id: "cat-1",
        amount: 100, // Integer
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        category: { id: "cat-1", name: "Food" },
      };

      const result = ExpenseTransformer.toDTO(dbExpense);

      expect(result.amount).toBe("100");
      expect(typeof result.amount).toBe("string");
    });
  });

  describe("toDTOList", () => {
    it("should transform array of database expenses to DTOs", () => {
      const dbExpenses: DatabaseExpense[] = [
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
        {
          id: "2",
          user_id: "user-1",
          category_id: "cat-2",
          amount: 20.75,
          expense_date: "2024-01-16",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
          created_at: "2024-01-16T10:00:00Z",
          updated_at: "2024-01-16T10:00:00Z",
          category: { id: "cat-2", name: "Transport" },
        },
      ];

      const result = ExpenseTransformer.toDTOList(dbExpenses);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[0].amount).toBe("10.5");
      expect(result[1].id).toBe("2");
      expect(result[1].amount).toBe("20.75");
    });

    it("should handle empty array", () => {
      const result = ExpenseTransformer.toDTOList([]);
      expect(result).toEqual([]);
    });
  });

  describe("toInsertData", () => {
    it("should transform CreateExpenseCommand to InsertExpense", () => {
      const command: CreateExpenseCommand = {
        category_id: "cat-1",
        amount: 100.5,
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = ExpenseTransformer.toInsertData(command, "user-1");

      expect(result).toEqual({
        user_id: "user-1",
        category_id: "cat-1",
        amount: 100.5,
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      });
    });

    it("should use default PLN currency when not provided", () => {
      const command: CreateExpenseCommand = {
        category_id: "cat-1",
        amount: 100,
        expense_date: "2024-01-15",
      };

      const result = ExpenseTransformer.toInsertData(command, "user-1");

      expect(result.currency).toBe("PLN");
    });

    it("should respect provided currency", () => {
      const command: CreateExpenseCommand = {
        category_id: "cat-1",
        amount: 100,
        expense_date: "2024-01-15",
        currency: "EUR",
      };

      const result = ExpenseTransformer.toInsertData(command, "user-1");

      expect(result.currency).toBe("EUR");
    });

    it("should always set AI flags to false for manual creation", () => {
      const command: CreateExpenseCommand = {
        category_id: "cat-1",
        amount: 100,
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = ExpenseTransformer.toInsertData(command, "user-1");

      expect(result.created_by_ai).toBe(false);
      expect(result.was_ai_suggestion_edited).toBe(false);
    });
  });

  describe("toBatchInsertData", () => {
    it("should transform batch items to insert data", () => {
      const items: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "10.50",
          expense_date: "2024-01-15",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
        {
          category_id: "cat-2",
          amount: "20.75",
          expense_date: "2024-01-16",
          currency: "PLN",
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        },
      ];

      const result = ExpenseTransformer.toBatchInsertData(items, "user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user_id: "user-1",
        category_id: "cat-1",
        amount: 10.5, // Parsed from string
        expense_date: "2024-01-15",
        currency: "PLN",
        created_by_ai: true,
        was_ai_suggestion_edited: false,
      });
      expect(result[1]).toEqual({
        user_id: "user-1",
        category_id: "cat-2",
        amount: 20.75,
        expense_date: "2024-01-16",
        currency: "PLN",
        created_by_ai: true,
        was_ai_suggestion_edited: false,
      });
    });

    it("should parse string amounts to floats", () => {
      const items: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "100.99",
          expense_date: "2024-01-15",
          currency: "PLN",
        },
      ];

      const result = ExpenseTransformer.toBatchInsertData(items, "user-1");

      expect(result[0].amount).toBe(100.99);
      expect(typeof result[0].amount).toBe("number");
    });

    it("should use default PLN currency for items without currency", () => {
      const items: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "50",
          expense_date: "2024-01-15",
        },
      ];

      const result = ExpenseTransformer.toBatchInsertData(items, "user-1");

      expect(result[0].currency).toBe("PLN");
    });

    it("should default AI flags to false when not provided", () => {
      const items: BatchExpenseItem[] = [
        {
          category_id: "cat-1",
          amount: "50",
          expense_date: "2024-01-15",
          currency: "PLN",
        },
      ];

      const result = ExpenseTransformer.toBatchInsertData(items, "user-1");

      expect(result[0].created_by_ai).toBe(false);
      expect(result[0].was_ai_suggestion_edited).toBe(false);
    });

    it("should handle empty array", () => {
      const result = ExpenseTransformer.toBatchInsertData([], "user-1");
      expect(result).toEqual([]);
    });
  });

  describe("toUpdateData", () => {
    it("should transform UpdateExpenseCommand with all fields", () => {
      const command: UpdateExpenseCommand = {
        category_id: "cat-2",
        amount: 150.75,
        expense_date: "2024-01-20",
        currency: "EUR",
      };

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({
        category_id: "cat-2",
        amount: 150.75,
        expense_date: "2024-01-20",
        currency: "EUR",
      });
    });

    it("should only include provided fields", () => {
      const command: UpdateExpenseCommand = {
        amount: 200,
      };

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({
        amount: 200,
      });
      expect(result).not.toHaveProperty("category_id");
      expect(result).not.toHaveProperty("expense_date");
      expect(result).not.toHaveProperty("currency");
    });

    it("should handle partial update with category_id only", () => {
      const command: UpdateExpenseCommand = {
        category_id: "cat-3",
      };

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({
        category_id: "cat-3",
      });
    });

    it("should handle partial update with expense_date only", () => {
      const command: UpdateExpenseCommand = {
        expense_date: "2024-02-01",
      };

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({
        expense_date: "2024-02-01",
      });
    });

    it("should handle partial update with currency only", () => {
      const command: UpdateExpenseCommand = {
        currency: "USD",
      };

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({
        currency: "USD",
      });
    });

    it("should handle empty command", () => {
      const command: UpdateExpenseCommand = {};

      const result = ExpenseTransformer.toUpdateData(command);

      expect(result).toEqual({});
    });
  });
});
