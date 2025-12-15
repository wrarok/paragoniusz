import { describe, it, expect } from "vitest";
import { ExpenseFormTransformer } from "@/lib/transformers/expense-form.transformer";
import type { ExpenseFormValues } from "@/lib/validation/expense-form.schema";
import type { ExpenseDTO } from "@/types";

describe("ExpenseFormTransformer", () => {
  describe("toCreateCommand", () => {
    it("should transform form data to create command", () => {
      const formData: ExpenseFormValues = {
        category_id: "cat-123",
        amount: "50.50",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = ExpenseFormTransformer.toCreateCommand(formData);

      expect(result).toEqual({
        category_id: "cat-123",
        amount: 50.5,
        expense_date: "2024-01-15",
        currency: "PLN",
      });
    });

    it("should handle integer amounts", () => {
      const formData: ExpenseFormValues = {
        category_id: "cat-123",
        amount: "100",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = ExpenseFormTransformer.toCreateCommand(formData);

      expect(result.amount).toBe(100);
    });

    it("should handle decimal amounts with precision", () => {
      const formData: ExpenseFormValues = {
        category_id: "cat-123",
        amount: "99.99",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const result = ExpenseFormTransformer.toCreateCommand(formData);

      expect(result.amount).toBe(99.99);
    });
  });

  describe("toUpdateCommand", () => {
    it("should transform form data to update command", () => {
      const formData: ExpenseFormValues = {
        category_id: "cat-456",
        amount: "75.25",
        expense_date: "2024-02-20",
        currency: "EUR",
      };

      const result = ExpenseFormTransformer.toUpdateCommand(formData);

      expect(result).toEqual({
        category_id: "cat-456",
        amount: 75.25,
        expense_date: "2024-02-20",
        currency: "EUR",
      });
    });

    it("should produce same result as toCreateCommand", () => {
      const formData: ExpenseFormValues = {
        category_id: "cat-123",
        amount: "50.50",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const createResult = ExpenseFormTransformer.toCreateCommand(formData);
      const updateResult = ExpenseFormTransformer.toUpdateCommand(formData);

      expect(createResult).toEqual(updateResult);
    });
  });

  describe("fromDTO", () => {
    it("should transform DTO to form data", () => {
      const dto: ExpenseDTO = {
        id: "exp-123",
        user_id: "user-123",
        category_id: "cat-789",
        category: { id: "cat-789", name: "Test Category" },
        amount: "125.75",
        expense_date: "2024-03-10",
        currency: "USD",
        created_at: "2024-03-10T10:00:00Z",
        updated_at: "2024-03-10T10:00:00Z",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      };

      const result = ExpenseFormTransformer.fromDTO(dto);

      expect(result).toEqual({
        category_id: "cat-789",
        amount: "125.75",
        expense_date: "2024-03-10",
        currency: "USD",
      });
    });

    it("should preserve amount as string", () => {
      const dto: ExpenseDTO = {
        id: "exp-123",
        user_id: "user-123",
        category_id: "cat-789",
        category: { id: "cat-789", name: "Test Category" },
        amount: "99.99",
        expense_date: "2024-03-10",
        currency: "PLN",
        created_at: "2024-03-10T10:00:00Z",
        updated_at: "2024-03-10T10:00:00Z",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      };

      const result = ExpenseFormTransformer.fromDTO(dto);

      expect(typeof result.amount).toBe("string");
      expect(result.amount).toBe("99.99");
    });

    it("should only include form-relevant fields", () => {
      const dto: ExpenseDTO = {
        id: "exp-123",
        user_id: "user-123",
        category_id: "cat-789",
        category: { id: "cat-789", name: "Test Category" },
        amount: "125.75",
        expense_date: "2024-03-10",
        currency: "PLN",
        created_at: "2024-03-10T10:00:00Z",
        updated_at: "2024-03-10T10:00:00Z",
        created_by_ai: true,
        was_ai_suggestion_edited: true,
      };

      const result = ExpenseFormTransformer.fromDTO(dto);

      expect(result).not.toHaveProperty("id");
      expect(result).not.toHaveProperty("user_id");
      expect(result).not.toHaveProperty("created_at");
      expect(result).not.toHaveProperty("updated_at");
      expect(result).not.toHaveProperty("created_by_ai");
      expect(result).not.toHaveProperty("was_ai_suggestion_edited");
    });
  });

  describe("round-trip transformations", () => {
    it("should maintain data integrity through DTO -> Form -> Command cycle", () => {
      const originalDTO: ExpenseDTO = {
        id: "exp-123",
        user_id: "user-123",
        category_id: "cat-789",
        category: { id: "cat-789", name: "Test Category" },
        amount: "75.50",
        expense_date: "2024-01-15",
        currency: "PLN",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        created_by_ai: false,
        was_ai_suggestion_edited: false,
      };

      // DTO -> Form Data
      const formData = ExpenseFormTransformer.fromDTO(originalDTO);

      // Form Data -> Update Command
      const updateCommand = ExpenseFormTransformer.toUpdateCommand(formData);

      // Verify critical fields maintained
      expect(updateCommand.category_id).toBe(originalDTO.category_id);
      expect(updateCommand.amount).toBe(parseFloat(originalDTO.amount));
      expect(updateCommand.expense_date).toBe(originalDTO.expense_date);
      expect(updateCommand.currency).toBe(originalDTO.currency);
    });
  });
});
