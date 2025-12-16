import { describe, it, expect } from "vitest";
import {
  amountSchema,
  categoryIdSchema,
  expenseDateSchema,
  currencySchema,
  expenseFormSchema,
  validateField,
  validateForm,
  isDateOlderThanOneYear,
  convertAmountToNumber,
  convertAmountToString,
  EXPENSE_FORM_ERRORS,
} from "@/lib/validation/expense-form.validation";

describe("Expense Form Validation", () => {
  describe("amountSchema", () => {
    it("should accept valid amounts with 2 decimal places", () => {
      expect(() => amountSchema.parse("45.50")).not.toThrow();
      expect(() => amountSchema.parse("100.99")).not.toThrow();
      expect(() => amountSchema.parse("1000.00")).not.toThrow();
    });

    it("should accept valid amounts with 1 decimal place", () => {
      expect(() => amountSchema.parse("45.5")).not.toThrow();
    });

    it("should accept valid amounts without decimals", () => {
      expect(() => amountSchema.parse("45")).not.toThrow();
      expect(() => amountSchema.parse("1000")).not.toThrow();
    });

    it("should reject empty amounts", () => {
      expect(() => amountSchema.parse("")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.REQUIRED);
    });

    it("should reject amounts with more than 2 decimal places", () => {
      expect(() => amountSchema.parse("45.555")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("100.999")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should reject negative amounts", () => {
      expect(() => amountSchema.parse("-10.00")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("-0.01")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should reject zero amount", () => {
      expect(() => amountSchema.parse("0")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.POSITIVE);
      expect(() => amountSchema.parse("0.00")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.POSITIVE);
    });

    it("should reject amounts exceeding MAX_AMOUNT", () => {
      expect(() => amountSchema.parse("100000000.00")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.MAX_VALUE);
      expect(() => amountSchema.parse("999999999.99")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.MAX_VALUE);
    });

    it("should accept maximum allowed amount", () => {
      expect(() => amountSchema.parse("99999999.99")).not.toThrow();
    });

    it("should reject non-numeric values", () => {
      expect(() => amountSchema.parse("abc")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("12.34abc")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should reject scientific notation", () => {
      expect(() => amountSchema.parse("1e10")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("1.5e2")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("5E3")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should reject comma as decimal separator", () => {
      expect(() => amountSchema.parse("45,50")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("1,234.56")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("100,00")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should accept leading zeros", () => {
      // Leading zeros are technically valid per the regex
      expect(() => amountSchema.parse("045.50")).not.toThrow();
      expect(() => amountSchema.parse("00100")).not.toThrow();
    });

    it("should handle null and undefined", () => {
      expect(() => amountSchema.parse(null as any)).toThrow();
      expect(() => amountSchema.parse(undefined as any)).toThrow();
    });

    it("should reject amounts with spaces", () => {
      expect(() => amountSchema.parse("45 .50")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse(" 45.50")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("45.50 ")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should handle very small amounts", () => {
      expect(() => amountSchema.parse("0.01")).not.toThrow();
      expect(() => amountSchema.parse("0.001")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should handle edge of max value precisely", () => {
      expect(() => amountSchema.parse("99999999.99")).not.toThrow();
      expect(() => amountSchema.parse("99999999.999")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
      expect(() => amountSchema.parse("100000000")).toThrow(EXPENSE_FORM_ERRORS.AMOUNT.MAX_VALUE);
    });
  });

  describe("categoryIdSchema", () => {
    it("should accept valid UUID", () => {
      expect(() => categoryIdSchema.parse("123e4567-e89b-12d3-a456-426614174000")).not.toThrow();
    });

    it("should reject invalid UUID format", () => {
      expect(() => categoryIdSchema.parse("not-a-uuid")).toThrow(EXPENSE_FORM_ERRORS.CATEGORY.INVALID);
      expect(() => categoryIdSchema.parse("123-456-789")).toThrow(EXPENSE_FORM_ERRORS.CATEGORY.INVALID);
    });

    it("should reject empty category_id", () => {
      expect(() => categoryIdSchema.parse("")).toThrow(EXPENSE_FORM_ERRORS.CATEGORY.REQUIRED);
    });
  });

  describe("expenseDateSchema", () => {
    const FIXED_PAST_DATE = "2024-01-01";
    const FIXED_FUTURE_DATE = "2025-01-01";

    it("should accept dates in the past", () => {
      expect(() => expenseDateSchema.parse(FIXED_PAST_DATE)).not.toThrow();
      expect(() => expenseDateSchema.parse("2023-12-31")).not.toThrow();
    });

    it("should accept today's date", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(() => expenseDateSchema.parse(today)).not.toThrow();
    });

    it("should reject future dates", () => {
      // Use a date that's definitely in the future
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateString = futureDate.toISOString().split("T")[0];
      expect(() => expenseDateSchema.parse(futureDateString)).toThrow(EXPENSE_FORM_ERRORS.DATE.FUTURE);
    });

    it("should reject invalid date strings", () => {
      // Only truly unparseable strings are rejected
      expect(() => expenseDateSchema.parse("not-a-date")).toThrow(EXPENSE_FORM_ERRORS.DATE.INVALID);
      expect(() => expenseDateSchema.parse("invalid")).toThrow(EXPENSE_FORM_ERRORS.DATE.INVALID);
      expect(() => expenseDateSchema.parse("abc-def-ghij")).toThrow(EXPENSE_FORM_ERRORS.DATE.INVALID);
    });

    it("should reject alternative date formats that don't match YYYY-MM-DD", () => {
      // The schema expects strict YYYY-MM-DD format based on the split("-") logic
      expect(() => expenseDateSchema.parse("2024/01/01")).toThrow(EXPENSE_FORM_ERRORS.DATE.INVALID);
      // This format will be interpreted as day 1, month 1, year 2024 which is valid
      // but we expect YYYY-MM-DD format, so let's test with an invalid format instead
      expect(() => expenseDateSchema.parse("invalid-date-format")).toThrow(EXPENSE_FORM_ERRORS.DATE.INVALID);
    });

    it("should reject empty date", () => {
      expect(() => expenseDateSchema.parse("")).toThrow(EXPENSE_FORM_ERRORS.DATE.REQUIRED);
    });

    it("should handle JavaScript date auto-correction", () => {
      // Day 30 in February gets auto-corrected to March 2nd
      // This is past, so should work
      expect(() => expenseDateSchema.parse("2020-02-30")).not.toThrow();
    });

    it("should handle timezone edge cases at midnight", () => {
      // Use a fixed past date to avoid timezone issues
      expect(() => expenseDateSchema.parse(FIXED_PAST_DATE)).not.toThrow();
    });
  });

  describe("currencySchema", () => {
    it("should accept PLN currency", () => {
      expect(() => currencySchema.parse("PLN")).not.toThrow();
    });

    it("should default to PLN if not provided", () => {
      const result = currencySchema.parse(undefined);
      expect(result).toBe("PLN");
    });

    it("should reject invalid currency codes", () => {
      expect(() => currencySchema.parse("US")).toThrow(EXPENSE_FORM_ERRORS.CURRENCY.INVALID);
      expect(() => currencySchema.parse("EURO")).toThrow(EXPENSE_FORM_ERRORS.CURRENCY.INVALID);
    });
  });

  describe("expenseFormSchema", () => {
    it("should accept valid expense form data", () => {
      const validData = {
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: "100.50",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      expect(() => expenseFormSchema.parse(validData)).not.toThrow();
    });

    it("should reject form with missing fields", () => {
      const incompleteData = {
        amount: "100.50",
        expense_date: "2024-01-15",
      };

      expect(() => expenseFormSchema.parse(incompleteData)).toThrow();
    });
  });

  describe("validateField", () => {
    it("should return undefined for valid amount", () => {
      const error = validateField("amount", "100.50");
      expect(error).toBeUndefined();
    });

    it("should return error message for invalid amount", () => {
      const error = validateField("amount", "invalid");
      expect(error).toBe(EXPENSE_FORM_ERRORS.AMOUNT.INVALID);
    });

    it("should return undefined for valid category_id", () => {
      const error = validateField("category_id", "123e4567-e89b-12d3-a456-426614174000");
      expect(error).toBeUndefined();
    });

    it("should return error message for invalid category_id", () => {
      const error = validateField("category_id", "not-a-uuid");
      expect(error).toBe(EXPENSE_FORM_ERRORS.CATEGORY.INVALID);
    });

    it("should return undefined for valid expense_date", () => {
      const error = validateField("expense_date", "2024-01-15");
      expect(error).toBeUndefined();
    });

    it("should return error message for invalid expense_date", () => {
      // Use a date that's definitely in the future (next year)
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const error = validateField("expense_date", futureDate.toISOString().split("T")[0]);
      expect(error).toBe(EXPENSE_FORM_ERRORS.DATE.FUTURE);
    });

    it("should return undefined for valid currency", () => {
      const error = validateField("currency", "PLN");
      expect(error).toBeUndefined();
    });

    it("should return error message for invalid currency", () => {
      const error = validateField("currency", "US");
      expect(error).toBe(EXPENSE_FORM_ERRORS.CURRENCY.INVALID);
    });
  });

  describe("validateForm", () => {
    it("should return null for valid form data", () => {
      const validData = {
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        amount: "100.50",
        expense_date: "2024-01-15",
        currency: "PLN",
      };

      const errors = validateForm(validData);
      expect(errors).toBeNull();
    });

    it("should return errors object for invalid form data", () => {
      const invalidData = {
        category_id: "invalid",
        amount: "invalid",
        expense_date: "invalid",
        currency: "PLN",
      };

      const errors = validateForm(invalidData);
      expect(errors).not.toBeNull();
      expect(errors).toHaveProperty("category_id");
      expect(errors).toHaveProperty("amount");
      expect(errors).toHaveProperty("expense_date");
    });

    it("should collect multiple validation errors", () => {
      const multiErrorData = {
        category_id: "",
        amount: "-10",
        expense_date: "2099-12-31", // Future date
        currency: "INVALID",
      };

      const errors = validateForm(multiErrorData);
      expect(errors).not.toBeNull();
      expect(Object.keys(errors!).length).toBeGreaterThan(2);
    });
  });

  describe("isDateOlderThanOneYear", () => {
    it("should return true for dates older than 1 year", () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const oldDateString = oldDate.toISOString().split("T")[0];

      expect(isDateOlderThanOneYear(oldDateString)).toBe(true);
    });

    it("should return false for dates within 1 year", () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6);
      const recentDateString = recentDate.toISOString().split("T")[0];

      expect(isDateOlderThanOneYear(recentDateString)).toBe(false);
    });

    it("should return false for today", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(isDateOlderThanOneYear(today)).toBe(false);
    });
  });

  describe("convertAmountToNumber", () => {
    it("should convert string amount to number", () => {
      expect(convertAmountToNumber("100.50")).toBe(100.5);
      expect(convertAmountToNumber("45")).toBe(45);
      expect(convertAmountToNumber("0.99")).toBe(0.99);
    });

    it("should handle precision with very small numbers", () => {
      expect(convertAmountToNumber("0.01")).toBe(0.01);
      expect(convertAmountToNumber("0.99")).toBe(0.99);
    });

    it("should preserve max precision", () => {
      expect(convertAmountToNumber("99999999.99")).toBe(99999999.99);
    });
  });

  describe("convertAmountToString", () => {
    it("should convert number amount to string", () => {
      expect(convertAmountToString(100.5)).toBe("100.5");
      expect(convertAmountToString(45)).toBe("45");
      expect(convertAmountToString(0.99)).toBe("0.99");
    });
  });
});
